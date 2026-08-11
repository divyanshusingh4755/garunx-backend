import { Types } from "mongoose";

import { TaxProfile, type ITaxProfile } from "../models/tax-profile.model.js";

import { ServicePricing } from "../models/servicepricing.model.js";

import { PackageTierPricing } from "../models/packagetierpricing.model.js";

import { escapeRegex } from "../utils/escapeRegex.js";
import type { TaxTreatment } from "../types/tax.types.js";

export interface CreateTaxProfilePayload {
  name: string;
  code: string;
  treatment: TaxTreatment;
  totalRate: number;
  description?: string | null;
  createdBy?: string | Types.ObjectId;
}

export interface UpdateTaxProfilePayload {
  name?: string;
  treatment?: TaxTreatment;
  totalRate?: number;
  description?: string | null;
  updatedBy?: string | Types.ObjectId;
}

export interface TaxProfileFilters {
  search?: string;
  treatment?: TaxTreatment;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

type TaxProfileQuery = Record<string, unknown>;

export class TaxProfileService {
  private static async getTaxProfileUsage(taxProfileId: Types.ObjectId) {
    const [servicePricing, packagePricing] = await Promise.all([
      ServicePricing.find({
        taxProfileId,
        isActive: true,
      })
        .populate("serviceId", "name")
        .populate("locationId", "name")
        .populate("tierId", "name")
        .populate("componentId", "name")
        .select("serviceId locationId tierId componentId")
        .lean(),

      PackageTierPricing.find({
        taxProfileId,
        isActive: true,
      })
        .populate("packageId", "name")
        .populate("locationId", "name")
        .populate("tierId", "name")
        .populate("serviceId", "name")
        .select("packageId locationId tierId serviceId")
        .lean(),
    ]);

    const serviceMap = new Map<
      string,
      {
        serviceId: string;
        serviceName: string;
        pricingCount: number;
      }
    >();

    for (const pricing of servicePricing) {
      const service = pricing.serviceId as unknown as {
        _id: Types.ObjectId;
        name?: string;
      } | null;

      if (!service?._id) {
        continue;
      }

      const serviceId = service._id.toString();

      const existing = serviceMap.get(serviceId);

      if (existing) {
        existing.pricingCount += 1;
      } else {
        serviceMap.set(serviceId, {
          serviceId,
          serviceName: service.name ?? "Unknown service",
          pricingCount: 1,
        });
      }
    }

    const packageMap = new Map<
      string,
      {
        packageId: string;
        packageName: string;
        pricingCount: number;
      }
    >();

    for (const pricing of packagePricing) {
      const packageDocument = pricing.packageId as unknown as {
        _id: Types.ObjectId;
        name?: string;
      } | null;

      if (!packageDocument?._id) {
        continue;
      }

      const packageId = packageDocument._id.toString();

      const existing = packageMap.get(packageId);

      if (existing) {
        existing.pricingCount += 1;
      } else {
        packageMap.set(packageId, {
          packageId,
          packageName: packageDocument.name ?? "Unknown package",
          pricingCount: 1,
        });
      }
    }

    const services = Array.from(serviceMap.values());

    const packages = Array.from(packageMap.values());

    return {
      services,
      packages,
      summary: {
        servicePricingCount: servicePricing.length,
        packagePricingCount: packagePricing.length,
        affectedServiceCount: services.length,
        affectedPackageCount: packages.length,
      },
    };
  }

  private static validateObjectId(
    id: string,
    fieldName = "taxProfileId",
  ): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ${fieldName}`);
    }
  }

  private static toObjectId(
    value: string | Types.ObjectId,
    fieldName: string,
  ): Types.ObjectId {
    const stringValue = value.toString();

    this.validateObjectId(stringValue, fieldName);

    return new Types.ObjectId(stringValue);
  }

  private static normalizeOptionalString(
    value?: string | null,
  ): string | undefined {
    const normalized = value?.trim();

    return normalized || undefined;
  }

  private static validateTreatmentRate(
    treatment: TaxTreatment,
    totalRate: number,
  ): void {
    if (treatment === "TAXABLE" && totalRate <= 0) {
      throw new Error("Taxable tax profile must have a rate greater than zero");
    }

    if (treatment !== "TAXABLE" && totalRate !== 0) {
      throw new Error(
        "Non-taxable tax profiles must have a rate equal to zero",
      );
    }
  }

  static async createTaxProfile(
    payload: CreateTaxProfilePayload,
  ): Promise<ITaxProfile> {
    const code = payload.code.trim().toUpperCase();

    const name = payload.name.trim();

    this.validateTreatmentRate(payload.treatment, payload.totalRate);

    const existingProfile = await TaxProfile.findOne({
      code,
    })
      .select("_id")
      .lean();

    if (existingProfile) {
      throw new Error(`Tax profile with code ${code} already exists`);
    }

    const description = this.normalizeOptionalString(payload.description);

    const createPayload: {
      name: string;
      code: string;
      treatment: TaxTreatment;
      totalRate: number;
      isActive: true;
      description?: string;
      createdBy?: Types.ObjectId;
      updatedBy?: Types.ObjectId;
    } = {
      name,
      code,
      treatment: payload.treatment,
      totalRate: payload.totalRate,
      isActive: true,
    };

    if (description) {
      createPayload.description = description;
    }

    if (payload.createdBy) {
      const createdBy = this.toObjectId(payload.createdBy, "createdBy");

      createPayload.createdBy = createdBy;

      createPayload.updatedBy = createdBy;
    }

    try {
      return await TaxProfile.create(createPayload);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        throw new Error(`Tax profile with code ${code} already exists`);
      }

      throw error;
    }
  }

  static async getTaxProfiles(filters: TaxProfileFilters = {}) {
    const page =
      Number.isInteger(filters.page) && (filters.page ?? 0) > 0
        ? filters.page!
        : 1;

    const limit =
      Number.isInteger(filters.limit) && (filters.limit ?? 0) > 0
        ? Math.min(filters.limit!, 100)
        : 20;

    const skip = (page - 1) * limit;

    const query: TaxProfileQuery = {};

    if (filters.treatment) {
      query.treatment = filters.treatment;
    }

    if (typeof filters.isActive === "boolean") {
      query.isActive = filters.isActive;
    }

    if (filters.search?.trim()) {
      const regex = {
        $regex: escapeRegex(filters.search.trim()),
        $options: "i",
      };

      query.$or = [{ name: regex }, { code: regex }];
    }

    const [taxProfiles, total] = await Promise.all([
      TaxProfile.find(query)
        .populate("createdBy", "fullName email role")
        .populate("updatedBy", "fullName email role")
        .sort({
          isActive: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      TaxProfile.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: taxProfiles,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  static async getActiveTaxProfiles() {
    return TaxProfile.find({
      isActive: true,
    })
      .select("name code treatment totalRate")
      .sort({
        treatment: 1,
        totalRate: 1,
        name: 1,
      })
      .lean();
  }

  static async getTaxProfileById(taxProfileId: string) {
    this.validateObjectId(taxProfileId);

    const taxProfile = await TaxProfile.findById(taxProfileId)
      .populate("createdBy", "fullName email role")
      .populate("updatedBy", "fullName email role")
      .lean();

    if (!taxProfile) {
      throw new Error("Tax profile not found");
    }

    return taxProfile;
  }

  static async updateTaxProfile(
    taxProfileId: string,
    payload: UpdateTaxProfilePayload,
  ) {
    this.validateObjectId(taxProfileId);

    const taxProfile = await TaxProfile.findById(taxProfileId);

    if (!taxProfile) {
      throw new Error("Tax profile not found");
    }

    const nextTreatment = payload.treatment ?? taxProfile.treatment;

    const nextTotalRate = payload.totalRate ?? taxProfile.totalRate;

    this.validateTreatmentRate(nextTreatment, nextTotalRate);

    if (payload.name !== undefined) {
      taxProfile.name = payload.name.trim();
    }

    if (payload.treatment !== undefined) {
      taxProfile.treatment = payload.treatment;
    }

    if (payload.totalRate !== undefined) {
      taxProfile.totalRate = payload.totalRate;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "description")) {
      const description = this.normalizeOptionalString(payload.description);

      if (description) {
        taxProfile.description = description;
      } else {
        taxProfile.set("description", undefined);
      }
    }

    if (payload.updatedBy) {
      taxProfile.updatedBy = this.toObjectId(payload.updatedBy, "updatedBy");
    }

    return taxProfile.save();
  }

  static async updateTaxProfileStatus(
    taxProfileId: string,
    isActive: boolean,
    updatedBy?: string | Types.ObjectId,
  ) {
    this.validateObjectId(taxProfileId);

    const taxProfile = await TaxProfile.findById(taxProfileId);

    if (!taxProfile) {
      throw new Error("Tax profile not found");
    }

    if (taxProfile.isActive === isActive) {
      return taxProfile;
    }

    if (!isActive) {
      const usage = await this.getTaxProfileUsage(taxProfile._id);

      const isInUse =
        usage.summary.servicePricingCount > 0 ||
        usage.summary.packagePricingCount > 0;

      if (isInUse) {
        const error = new Error(
          "Cannot deactivate this tax profile because it is used by active service or package pricing. Reassign those pricing records first.",
        ) as Error & {
          statusCode?: number;
          details?: unknown;
        };

        error.statusCode = 409;
        error.details = usage;

        throw error;
      }
    }

    taxProfile.isActive = isActive;

    if (updatedBy) {
      taxProfile.updatedBy = this.toObjectId(updatedBy, "updatedBy");
    }

    return taxProfile.save();
  }
}
