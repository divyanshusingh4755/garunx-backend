import { Package } from "../models/package.model.js";
import { Product } from "../models/product.model.js";
import { Service } from "../models/service.model.js";

export interface IPricingRequest {
  targetId: string;
  type: "SERVICE" | "PACKAGE";
  selectedVariantIds?: string[];
}

export interface PriceBreakdown {
  subTotal: number;
  discount: number;
  discountPercentage: number;
  total: number;
}

export class PricingService {
  async calculate(request: IPricingRequest): Promise<PriceBreakdown> {
    if (request.type === "SERVICE") {
      const serviceRes = await this.calculateService(request);

      return {
        subTotal: serviceRes.total,
        discount: 0,
        discountPercentage: 0,
        total: serviceRes.total,
      };
    } else if (request.type === "PACKAGE") {
      return this.calculatePackage(request);
    }
    throw new Error("Invalid calculation type");
  }

  private async calculateService(
    req: IPricingRequest,
  ): Promise<{ total: number }> {
    const serviceDoc = await Service.findOne({
      _id: req.targetId,
      isActive: true,
    }).lean();
    if (!serviceDoc)
      throw new Error(`Service ${req.targetId} is not available or inactive`);

    const selectedIds = req.selectedVariantIds || [];
    if (selectedIds.length > 50) throw new Error("Too many items selected.");

    const products = await Product.find({
      "variants._id": { $in: selectedIds },
      isActive: true,
    }).lean();

    let total = 0;
    let itemsProcessed = 0;
    let detectedLocation: string | null = null;

    const variantMap = new Map();
    products.forEach((p) => {
      p.variants.forEach((v) => variantMap.set(v._id.toString(), v));
    });

    selectedIds.forEach((selectedId) => {
      const variantData = variantMap.get(selectedId.toString());

      if (!variantData) {
        throw new Error(
          `Variant ${selectedId} not found or belongs to an inactive product.`,
        );
      }

      if (variantData.isActive) {
        if (!detectedLocation) {
          detectedLocation = variantData.location;
        } else if (detectedLocation !== variantData.location) {
          throw new Error(
            `Location mismatch: Items must all be from ${detectedLocation}`,
          );
        }

        total += variantData.price;
        itemsProcessed++;
      }
    });

    if (detectedLocation && !serviceDoc.locations.includes(detectedLocation)) {
      throw new Error(`Service is not offered in ${detectedLocation}`);
    }

    if (itemsProcessed !== selectedIds.length) {
      throw new Error("One or more selected items are invalid or inactive.");
    }

    return { total };
  }

  private async calculatePackage(
    req: IPricingRequest,
  ): Promise<PriceBreakdown> {
    const packageDoc = await Package.findOne({
      _id: req.targetId,
      isActive: true,
    }).lean();
    if (!packageDoc)
      throw new Error(`Package ${req.targetId} is not available or inactive`);

    // Parallel execution for faster performance
    const serviceCalculations = await Promise.all(
      packageDoc.services.map((pService) =>
        this.calculateService({
          ...req,
          targetId: pService.serviceId.toString(),
        }),
      ),
    );

    const subTotal = serviceCalculations.reduce(
      (sum, res) => sum + res.total,
      0,
    );

    if (packageDoc.pricing.type === "FIXED") {
      const finalTotal = packageDoc.pricing.fixedPrice || 0;
      return {
        subTotal,
        discount: Math.max(0, subTotal - finalTotal),
        discountPercentage:
          subTotal > 0
            ? Math.round(((subTotal - finalTotal) / subTotal) * 100)
            : 0,
        total: finalTotal,
      };
    }

    const pct = packageDoc.pricing.discountPercentage || 0;
    const discountAmount = Math.round(subTotal * (pct / 100));

    return {
      subTotal,
      discount: discountAmount,
      discountPercentage: pct,
      total: subTotal - discountAmount,
    };
  }
}
