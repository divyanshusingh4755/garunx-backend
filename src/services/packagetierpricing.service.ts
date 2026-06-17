import { Types } from "mongoose";
import { Package } from "../models/package.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { PackageCascadingEngine } from "./package-cascading-engine.service.js";
import { ServicePricing } from "../models/servicepricing.model.js";

export class PackageTierPricingService {
  static async bulkUpsertTierPricing(payload: any) {
    const { packageId, tierId, pricing } = payload;

    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    if (!Types.ObjectId.isValid(tierId)) {
      throw new Error("Invalid tierId");
    }

    if (!Array.isArray(pricing) || pricing.length === 0) {
      throw new Error("Pricing array is required");
    }

    const pkg = await Package.findById(packageId);
    if (!pkg) throw new Error("Package not found");

    const tierExists = pkg.tiers.some((t) => t.tierId.toString() === tierId);

    if (!tierExists) {
      throw new Error("Tier does not belong to package");
    }

    const packageLocationIds = new Set(
      pkg.locations.map((l: any) => l.locationId.toString()),
    );

    const allServiceIds = new Set<string>();

    for (const loc of pricing) {
      if (!Types.ObjectId.isValid(loc.locationId)) {
        throw new Error(`Invalid locationId: ${loc.locationId}`);
      }

      if (!packageLocationIds.has(loc.locationId)) {
        throw new Error(`Location ${loc.locationId} not in package`);
      }

      if (!Array.isArray(loc.services) || loc.services.length === 0) {
        throw new Error("Each location must have services");
      }

      for (const s of loc.services) {
        allServiceIds.add(s.serviceId);
      }
    }

    const serviceObjectIds = Array.from(allServiceIds).map((id) => {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid serviceId: ${id}`);
      }
      return new Types.ObjectId(id);
    });

    const validMappings = await PackageTierMap.find({
      packageId,
      tierId,
      "services.serviceId": { $in: serviceObjectIds },
    });

    const validSet = new Set<string>();

    for (const m of validMappings) {
      for (const s of m.services) {
        validSet.add(s.serviceId.toString());
      }
    }

    if (validSet.size === 0) {
      throw new Error("Invalid services detected for this package tier");
    }

    const basePrices = await ServicePricing.find({
      serviceId: { $in: serviceObjectIds },
      tierId,
    }).lean();

    const basePriceMap = new Map(
      basePrices.map((p) => [
        `${p.locationId.toString()}_${p.serviceId.toString()}`,
        p.price,
      ]),
    );

    const bulkOps: any[] = [];
    const requestKeys = new Set<string>();

    for (const loc of pricing) {
      const locationId = loc.locationId;
      const seen = new Set<string>();

      for (const svc of loc.services) {
        const { serviceId, fixedPrice, discountPercent } = svc;

        if (!validSet.has(serviceId)) {
          throw new Error(`Invalid service ${serviceId}`);
        }

        if (seen.has(serviceId)) {
          throw new Error(`Duplicate service ${serviceId}`);
        }
        seen.add(serviceId);

        const basePrice = basePriceMap.get(`${locationId}_${serviceId}`);

        if (basePrice === undefined) {
          throw new Error(`Base price missing for service ${serviceId}`);
        }

        let finalPrice = basePrice;

        if (typeof fixedPrice === "number") {
          finalPrice = fixedPrice;
        } else if (typeof discountPercent === "number") {
          finalPrice = basePrice - (basePrice * discountPercent) / 100;
        }

        if (finalPrice < 0) {
          throw new Error(`Invalid final price for ${serviceId}`);
        }

        requestKeys.add(`${locationId}_${serviceId}`);

        bulkOps.push({
          updateOne: {
            filter: {
              packageId,
              tierId,
              locationId,
              serviceId,
            },
            update: {
              $set: {
                basePrice,
                fixedPrice: fixedPrice ?? null,
                discountPercent: discountPercent ?? null,
                finalPrice,
              },
            },
            upsert: true,
          },
        });
      }
    }

    const norConditions = Array.from(requestKeys).map((key) => {
      const [locationId, serviceId] = key.split("_");
      return {
        locationId: new Types.ObjectId(locationId),
        serviceId: new Types.ObjectId(serviceId),
      };
    });

    await PackageTierPricing.deleteMany({
      packageId,
      tierId,
      $nor: norConditions as any[],
    });

    if (bulkOps.length > 0) {
      await PackageTierPricing.bulkWrite(bulkOps);
    }

    await PackageCascadingEngine.run(packageId);

    return {
      success: true,
      message: "Package tier pricing updated successfully",
    };
  }

  static async resolvePricing(
    packageId: string,
    tierId: string,
    locationId: string,
  ) {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    if (!Types.ObjectId.isValid(tierId)) {
      throw new Error("Invalid tierId");
    }

    if (!Types.ObjectId.isValid(locationId)) {
      throw new Error("Invalid locationId");
    }

    const pkg = await Package.findById(packageId).lean();

    if (!pkg) throw new Error("Package not found");

    if (!pkg.isActive) {
      throw new Error("Package is inactive");
    }

    const tier = pkg.tiers.find((t: any) => t.tierId.toString() === tierId);

    if (!tier) {
      throw new Error("Tier does not belong to package");
    }

    const location = pkg.locations.find(
      (l: any) => l.locationId.toString() === locationId,
    );

    if (!location) {
      throw new Error("Location does not belong to package");
    }

    if (!location.isActive) {
      throw new Error("Location is inactive for this package");
    }

    const mappings = await PackageTierMap.find({
      packageId,
      tierId,
    })
      .populate({
        path: "services.serviceId",
        select: "name shortDescription thumbnailImage isActive",
      })
      .lean();

    const serviceList = mappings.flatMap((m: any) =>
      (m.services || []).map((s: any) => ({
        serviceId: s.serviceId._id.toString(),
        name: s.serviceId.name,
        shortDescription: s.serviceId.shortDescription,
        thumbnailImage: s.serviceId.thumbnailImage,
        isRequired: s.isRequired,
        isRelated: s.isRelated,
      })),
    );

    const serviceIds = serviceList.map((s) => new Types.ObjectId(s.serviceId));

    const basePricingDocs = await ServicePricing.find({
      serviceId: { $in: serviceIds },
      tierId,
      locationId,
    }).lean();

    const baseMap = new Map(
      basePricingDocs.map((p) => [p.serviceId.toString(), p.price]),
    );

    const overrideDocs = await PackageTierPricing.find({
      packageId,
      tierId,
      locationId,
    }).lean();

    const overrideMap = new Map(
      overrideDocs.map((p) => [
        p.serviceId.toString(),
        {
          basePrice: p.basePrice,
          fixedPrice: p.fixedPrice,
          discountPercent: p.discountPercent,
          finalPrice: p.finalPrice,
        },
      ]),
    );

    const resolvedServices = serviceList.map((s) => {
      const serviceId = s.serviceId;
      const basePrice = baseMap.get(s.serviceId) ?? null;
      const override = overrideMap.get(serviceId);
      const finalPrice = override?.finalPrice ?? basePrice;

      return {
        ...s,
        basePrice,
        fixedPrice: override?.fixedPrice ?? null,
        discountPercent: override?.discountPercent ?? null,
        price: finalPrice,
        isPriceConfigured: finalPrice !== null,
      };
    });

    const requiredServices = resolvedServices.filter((s) => s.isRequired);

    const optionalServices = resolvedServices.filter((s) => !s.isRequired);

    const startingPrice = requiredServices.reduce(
      (sum, s) => sum + (s.price ?? 0),
      0,
    );

    const isAvailable =
      requiredServices.every((s) => s.isPriceConfigured) &&
      optionalServices.every((s) => s.isPriceConfigured);

    return {
      package: {
        id: pkg._id,
        name: pkg.name,
        description: pkg.fullDescription,
      },

      tier: {
        id: tier.tierId,
        name: tier.name,
      },

      location: {
        id: location.locationId,
        name: location.name,
      },

      services: resolvedServices,

      summary: {
        totalServices: resolvedServices.length,
        requiredServiceCount: requiredServices.length,
        optionalServiceCount: optionalServices.length,
        startingPrice,
        isAvailable,
      },
    };
  }
}
