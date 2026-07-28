import { Types } from "mongoose";

import { ServicePricing } from "../models/servicepricing.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { TaxProfile } from "../models/tax-profile.model.js";

import { TaxCalculatorService } from "./tax-calculator.service.js";
import { TaxContextService } from "./tax-context.service.js";

import { taxConfig } from "../config/tax.config.js";

import {
  TaxSource,
  type ILineTax,
  type ITaxProfileSnapshot,
  type ITaxSummary,
} from "../types/tax.types.js";

interface CartComponentInput {
  componentId: Types.ObjectId;
  discountAmount?: number;
}

interface CartServiceInput {
  serviceId: Types.ObjectId;
  discountAmount?: number;
}

export interface CartPriceLine {
  amount: number;
  discountAmount: number;
  finalAmount: number;

  taxProfileId?: Types.ObjectId | null;
  taxPriceMode: "EXCLUSIVE" | "INCLUSIVE";

  tax?: ILineTax;
}

export interface CartTotals {
  basePrice: number;
  addonPrice: number;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;

  taxSummary: ITaxSummary & {
    supplierStateCode: string | undefined;
    placeOfSupplyStateCode: string | undefined;
  };

  componentLines: Map<string, CartPriceLine>;
  serviceLines: Map<string, CartPriceLine>;
}


export class CartPricingEngine {
  private static async loadTaxProfiles(
    taxProfileIds: Array<Types.ObjectId | null | undefined>,
  ): Promise<Map<string, any>> {
    const uniqueIds = [
      ...new Set(
        taxProfileIds
          .filter(
            (id): id is Types.ObjectId =>
              id !== null && id !== undefined,
          )
          .map((id) => id.toString()),
      ),
    ];

    if (uniqueIds.length === 0) {
      return new Map<string, any>();
    }

    const profiles = await TaxProfile.find({
      _id: {
        $in: uniqueIds.map(
          (id) => new Types.ObjectId(id),
        ),
      },

      isActive: true
    }).lean();

    return new Map(
      profiles.map((profile) => [
        profile._id.toString(),
        profile,
      ]),
    );
  }

  private static round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private static emptyTaxSummary(): ITaxSummary {
    return {
      taxableAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTax: 0,
    };
  }

  private static addLineTaxToSummary(
    summary: ITaxSummary,
    tax: ILineTax,
  ): void {
    summary.taxableAmount = this.round(
      summary.taxableAmount + tax.taxableAmount,
    );

    summary.cgstAmount = this.round(
      summary.cgstAmount + tax.cgstAmount,
    );

    summary.sgstAmount = this.round(
      summary.sgstAmount + tax.sgstAmount,
    );

    summary.igstAmount = this.round(
      summary.igstAmount + tax.igstAmount,
    );

    summary.totalTax = this.round(
      summary.totalTax + tax.totalTax,
    );
  }

  private static calculatePricingLine(params: {
    amount: number;
    discountAmount?: number;
    pricing: {
      taxProfileId?: Types.ObjectId | null;
      taxPriceMode?: "EXCLUSIVE" | "INCLUSIVE";
    };
    taxProfileMap: Map<string, any>;
    supplierStateCode: string | undefined;
    placeOfSupplyStateCode: string | undefined;
    source: TaxSource;
  }): CartPriceLine {
    const {
      amount,
      pricing,
      taxProfileMap,
      supplierStateCode,
      placeOfSupplyStateCode,
      source,
    } = params;

    const discountAmount = this.round(
      Math.max(params.discountAmount ?? 0, 0),
    );

    const normalizedAmount = this.round(amount);

    if (discountAmount > normalizedAmount) {
      throw new Error(
        "Line discount cannot be greater than the line amount",
      );
    }

    const taxProfileId = pricing.taxProfileId ?? null;

    const taxPriceMode =
      pricing.taxPriceMode ?? "EXCLUSIVE";

    /*
     * GST globally disabled or pricing has no TaxProfile.
     */
    if (!taxConfig.enabled || !taxProfileId) {
      return {
        amount: normalizedAmount,
        discountAmount,
        finalAmount: this.round(
          normalizedAmount - discountAmount,
        ),
        taxProfileId,
        taxPriceMode,
      };
    }

    if (!supplierStateCode || !placeOfSupplyStateCode) {
      throw new Error(
        "Tax context is required for taxable pricing",
      );
    }

    const taxProfile = taxProfileMap.get(
      taxProfileId.toString(),
    );

    if (!taxProfile) {
      throw new Error(
        `Active tax profile not found: ${taxProfileId.toString()}`,
      );
    }

    const profileSnapshot: ITaxProfileSnapshot = {
      taxProfileId: taxProfile._id,

      name: taxProfile.name,
      code: taxProfile.code,
      treatment: taxProfile.treatment,

      totalRate: taxProfile.totalRate,

      priceMode: taxPriceMode,
      source,
    };

    const tax = TaxCalculatorService.calculateLineTax({
      amount: normalizedAmount,
      discountAmount,
      profile: profileSnapshot,
      supplierStateCode,
      placeOfSupplyStateCode,
    });

    return {
      amount: normalizedAmount,
      discountAmount,
      finalAmount: tax.finalAmount,

      taxProfileId,
      taxPriceMode,

      tax,
    };
  }

  static async calculateServiceCart(
    cart: any,
  ): Promise<CartTotals> {
    const [serviceComponents, pricingRows] =
      await Promise.all([
        ServiceComponent.find({
          serviceId: cart.serviceId,
          tierId: cart.tierId,
        }).lean(),

        ServicePricing.find({
          serviceId: cart.serviceId,
          tierId: cart.tierId,
          locationId: cart.locationId,
        }).lean(),
      ]);

    const pricingMap = new Map(
      pricingRows.map((pricing) => [
        pricing.componentId.toString(),
        pricing,
      ]),
    );

    const taxProfileMap = await this.loadTaxProfiles(
      pricingRows.map((pricing) => pricing.taxProfileId),
    );

    let supplierStateCode: string | undefined;
    let placeOfSupplyStateCode: string | undefined;

    if (taxConfig.enabled) {
      const taxContext =
        await TaxContextService.resolveByLocationId(
          cart.locationId,
        );

      supplierStateCode =
        taxContext.supplierStateCode;

      placeOfSupplyStateCode =
        taxContext.placeOfSupplyStateCode;
    }

    const requiredComponentIds = serviceComponents
      .filter((component) => component.isRequired)
      .map((component) =>
        component.componentId.toString(),
      );

    const requiredComponentIdSet = new Set(
      requiredComponentIds,
    );

    const selectedComponentMap =
      new Map<string, CartComponentInput>(
        (cart.selectedComponents ?? []).map(
          (component: CartComponentInput): [
            string,
            CartComponentInput,
          ] => [
              component.componentId.toString(),
              component,
            ],
        ),
      );

    const componentLines =
      new Map<string, CartPriceLine>();

    const taxSummary = this.emptyTaxSummary();

    let basePrice = 0;
    let addonPrice = 0;
    let discountAmount = 0;
    let totalAmount = 0;

    /*
     * Required components.
     */
    for (const componentId of requiredComponentIds) {
      const pricing = pricingMap.get(componentId);

      if (!pricing) {
        throw new Error(
          `Pricing not found for required component: ${componentId}`,
        );
      }

      const cartComponent =
        selectedComponentMap.get(componentId);

      const line = this.calculatePricingLine({
        amount: pricing.price,

        discountAmount:
          cartComponent?.discountAmount ?? 0,

        pricing,
        taxProfileMap,

        supplierStateCode,
        placeOfSupplyStateCode,

        source: TaxSource.SERVICE_PRICING,
      });

      basePrice = this.round(
        basePrice + line.amount,
      );

      discountAmount = this.round(
        discountAmount + line.discountAmount,
      );

      totalAmount = this.round(
        totalAmount + line.finalAmount,
      );

      if (line.tax) {
        this.addLineTaxToSummary(
          taxSummary,
          line.tax,
        );
      }

      componentLines.set(componentId, line);
    }

    /*
     * Optional selected components.
     */
    for (
      const component of cart.selectedComponents ?? []
    ) {
      const componentId =
        component.componentId.toString();

      if (requiredComponentIdSet.has(componentId)) {
        continue;
      }

      const pricing = pricingMap.get(componentId);

      if (!pricing) {
        throw new Error(
          `Pricing not found for selected component: ${componentId}`,
        );
      }

      const line = this.calculatePricingLine({
        amount: pricing.price,

        discountAmount:
          component.discountAmount ?? 0,

        pricing,
        taxProfileMap,

        supplierStateCode,
        placeOfSupplyStateCode,

        source: TaxSource.SERVICE_PRICING,
      });

      basePrice = this.round(
        basePrice + line.amount,
      );

      discountAmount = this.round(
        discountAmount + line.discountAmount,
      );

      totalAmount = this.round(
        totalAmount + line.finalAmount,
      );

      if (line.tax) {
        this.addLineTaxToSummary(
          taxSummary,
          line.tax,
        );
      }

      componentLines.set(componentId, line);
    }

    /*
     * Addon components.
     */
    for (
      const component of cart.addonComponents ?? []
    ) {
      const componentId =
        component.componentId.toString();

      const pricing = pricingMap.get(componentId);

      if (!pricing) {
        throw new Error(
          `Pricing not found for addon component: ${componentId}`,
        );
      }

      const line = this.calculatePricingLine({
        amount: pricing.price,

        discountAmount:
          component.discountAmount ?? 0,

        pricing,
        taxProfileMap,

        supplierStateCode,
        placeOfSupplyStateCode,

        source: TaxSource.SERVICE_PRICING,
      });

      addonPrice = this.round(
        addonPrice + line.amount,
      );

      discountAmount = this.round(
        discountAmount + line.discountAmount,
      );

      totalAmount = this.round(
        totalAmount + line.finalAmount,
      );

      if (line.tax) {
        this.addLineTaxToSummary(
          taxSummary,
          line.tax,
        );
      }

      componentLines.set(componentId, line);
    }

    const subtotal = this.round(
      basePrice + addonPrice,
    );

    return {
      basePrice,
      addonPrice,
      subtotal,
      discountAmount,
      totalAmount,

      taxSummary: {
        ...taxSummary,
        supplierStateCode,
        placeOfSupplyStateCode,
      },

      componentLines,

      serviceLines:
        new Map<string, CartPriceLine>(),
    };
  }

  static async calculatePackageCart(
    cart: any,
  ): Promise<CartTotals> {
    const [packageTierMap, pricingRows] =
      await Promise.all([
        PackageTierMap.findOne({
          packageId: cart.packageId,
          tierId: cart.tierId,
        }).lean(),

        PackageTierPricing.find({
          packageId: cart.packageId,
          tierId: cart.tierId,
          locationId: cart.locationId,
        }).lean(),
      ]);

    if (!packageTierMap) {
      throw new Error(
        "Package tier mapping not found",
      );
    }

    const pricingMap = new Map(
      pricingRows.map((pricing) => [
        pricing.serviceId.toString(),
        pricing,
      ]),
    );

    const taxProfileMap = await this.loadTaxProfiles(
      pricingRows.map((pricing) => pricing.taxProfileId),
    );

    let supplierStateCode: string | undefined;
    let placeOfSupplyStateCode: string | undefined;

    if (taxConfig.enabled) {
      const taxContext =
        await TaxContextService.resolveByLocationId(
          cart.locationId,
        );

      supplierStateCode =
        taxContext.supplierStateCode;

      placeOfSupplyStateCode =
        taxContext.placeOfSupplyStateCode;
    }

    const selectedServiceMap =
      new Map<string, CartServiceInput>(
        (cart.selectedServices ?? []).map(
          (service: CartServiceInput): [
            string,
            CartServiceInput,
          ] => [
              service.serviceId.toString(),
              service,
            ],
        ),
      );

    const addonServiceMap =
      new Map<string, CartServiceInput>(
        (cart.addonServices ?? []).map(
          (service: CartServiceInput): [
            string,
            CartServiceInput,
          ] => [
              service.serviceId.toString(),
              service,
            ],
        ),
      );

    const serviceLines =
      new Map<string, CartPriceLine>();

    const taxSummary = this.emptyTaxSummary();

    let basePrice = 0;
    let addonPrice = 0;
    let discountAmount = 0;
    let totalAmount = 0;

    for (
      const service of packageTierMap.services ?? []
    ) {
      const serviceId =
        service.serviceId.toString();

      const pricing = pricingMap.get(serviceId);

      if (!pricing) {
        continue;
      }

      /*
       * Selected normal package service.
       */
      if (
        selectedServiceMap.has(serviceId) &&
        !service.isRelated
      ) {
        const selectedService =
          selectedServiceMap.get(serviceId);

        const line = this.calculatePricingLine({
          amount: pricing.finalPrice,

          discountAmount:
            selectedService?.discountAmount ?? 0,

          pricing,
          taxProfileMap,

          supplierStateCode,
          placeOfSupplyStateCode,

          source: TaxSource.PACKAGE_PRICING,
        });

        basePrice = this.round(
          basePrice + line.amount,
        );

        discountAmount = this.round(
          discountAmount + line.discountAmount,
        );

        totalAmount = this.round(
          totalAmount + line.finalAmount,
        );

        if (line.tax) {
          this.addLineTaxToSummary(
            taxSummary,
            line.tax,
          );
        }

        serviceLines.set(serviceId, line);
      }

      /*
       * Related service selected as addon.
       */
      if (
        addonServiceMap.has(serviceId) &&
        service.isRelated
      ) {
        const addonService =
          addonServiceMap.get(serviceId);

        const line = this.calculatePricingLine({
          amount: pricing.finalPrice,

          discountAmount:
            addonService?.discountAmount ?? 0,

          pricing,
          taxProfileMap,

          supplierStateCode,
          placeOfSupplyStateCode,

          source: TaxSource.PACKAGE_PRICING,
        });

        addonPrice = this.round(
          addonPrice + line.amount,
        );

        discountAmount = this.round(
          discountAmount + line.discountAmount,
        );

        totalAmount = this.round(
          totalAmount + line.finalAmount,
        );

        if (line.tax) {
          this.addLineTaxToSummary(
            taxSummary,
            line.tax,
          );
        }

        serviceLines.set(serviceId, line);
      }
    }

    const subtotal = this.round(
      basePrice + addonPrice,
    );

    return {
      basePrice,
      addonPrice,
      subtotal,
      discountAmount,
      totalAmount,

      taxSummary: {
        ...taxSummary,
        supplierStateCode,
        placeOfSupplyStateCode,
      },

      componentLines:
        new Map<string, CartPriceLine>(),

      serviceLines,
    };
  }

  static async calculateCartTotals(
    cart: any,
  ): Promise<CartTotals> {
    if (cart.serviceId) {
      return this.calculateServiceCart(cart);
    }

    if (cart.packageId) {
      return this.calculatePackageCart(cart);
    }

    return {
      basePrice: 0,
      addonPrice: 0,
      subtotal: 0,
      discountAmount: 0,
      totalAmount: 0,

      taxSummary: {
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTax: 0,

        supplierStateCode: undefined,
        placeOfSupplyStateCode: undefined,
      },

      componentLines:
        new Map<string, CartPriceLine>(),

      serviceLines:
        new Map<string, CartPriceLine>(),
    };
  }
}