import { Types } from "mongoose";
import mongoose from "mongoose";

import { Package } from "../models/package.model.js";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";

export class PackageCascadingEngine {
  static async run(packageId: string) {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const pkg = await Package.findById(packageId).session(session);
        if (!pkg) throw new Error("Package not found");

        await this.cleanupTierOrphans(pkg, session);
        await this.cleanupLocationOrphans(pkg, session);
        // await this.cleanupServiceOrphans(pkg, session);
        await this.cleanupPricing(pkg, session);

        const refreshed = await Package.findById(packageId).session(session);
        if (!refreshed) throw new Error("Package lost during cleanup");

        const isComplete = await this.computeIsComplete(refreshed, session);

        refreshed.isComplete = isComplete;
        refreshed.isActive = isComplete;

        await refreshed.save({ session });
      });
    } finally {
      session.endSession();
    }
  }

  static async cleanupTierOrphans(pkg: any, session: any) {
    const validTierIds = pkg.tiers.map((t: any) => t.tierId.toString());

    if (!validTierIds.length) {
      await PackageTierMap.deleteMany({ packageId: pkg._id }, { session });
      return;
    }

    await PackageTierMap.deleteMany(
      {
        packageId: pkg._id,
        tierId: { $nin: validTierIds },
      },
      { session },
    );
  }

  static async cleanupLocationOrphans(pkg: any, session: any) {
    const validLocationIds = pkg.locations.map((l: any) =>
      l.locationId.toString(),
    );

    if (!validLocationIds.length) {
      await PackageTierPricing.deleteMany({ packageId: pkg._id }, { session });
      return;
    }

    await PackageTierPricing.deleteMany(
      {
        packageId: pkg._id,
        locationId: { $nin: validLocationIds },
      },
      { session },
    );
  }

  // static async cleanupServiceOrphans(pkg: any, session: any) {
  //   const validTierIds = pkg.tiers.map((t: any) => t.tierId.toString());

  //   if (!validTierIds.length) {
  //     await PackageTierMap.deleteMany({ packageId: pkg._id }, { session });
  //     return;
  //   }

  //   await PackageTierMap.deleteMany(
  //     {
  //       packageId: pkg._id,
  //       tierId: { $nin: validTierIds },
  //     },
  //     { session },
  //   );
  // }

  static async cleanupPricing(pkg: any, session: any) {
    const validTierIds = new Set(
      pkg.tiers.map((t: any) => t.tierId.toString()),
    );

    const validLocationIds = new Set(
      pkg.locations.map((l: any) => l.locationId.toString()),
    );

    const mappings = await PackageTierMap.find({
      packageId: pkg._id,
    })
      .session(session)
      .lean();

    // Build tier -> service set map
    const serviceMapByTier = new Map<string, Set<string>>();

    for (const m of mappings) {
      const tierId = m.tierId.toString();

      if (!serviceMapByTier.has(tierId)) {
        serviceMapByTier.set(tierId, new Set());
      }

      const set = serviceMapByTier.get(tierId)!;

      for (const s of m.services || []) {
        set.add(s.serviceId.toString());
      }
    }

    const pricing = await PackageTierPricing.find({
      packageId: pkg._id,
    }).session(session);

    const deleteIds: Types.ObjectId[] = [];

    for (const p of pricing) {
      const tierId = p.tierId.toString();
      const locationId = p.locationId.toString();
      const serviceId = p.serviceId.toString();

      const tierValid = validTierIds.has(tierId);
      const locationValid = validLocationIds.has(locationId);

      const serviceSet = serviceMapByTier.get(tierId);
      const serviceValid = serviceSet?.has(serviceId);

      const invalid = !tierValid || !locationValid || !serviceValid;

      if (invalid) {
        deleteIds.push(p._id);
      }
    }

    if (deleteIds.length) {
      await PackageTierPricing.deleteMany(
        { _id: { $in: deleteIds } },
        { session },
      );
    }
  }

  static async computeIsComplete(pkg: any, session: any) {
    const mappings = await PackageTierMap.find({
      packageId: pkg._id,
    })
      .session(session)
      .lean();

    const pricing = await PackageTierPricing.find({
      packageId: pkg._id,
    })
      .session(session)
      .lean();

    const activeLocations = pkg.locations.filter((l: any) => l.isActive);

    if (!activeLocations.length) return false;
    if (!pkg.tiers.length) return false;
    if (!mappings.length) return false;

    const priceSet = new Set(
      pricing.map(
        (p) =>
          `${p.tierId.toString()}_${p.locationId.toString()}_${p.serviceId.toString()}`,
      ),
    );

    let totalServicesValidated = 0;

    for (const tier of pkg.tiers) {
      const tierId = tier.tierId.toString();

      const tierServices = mappings
        .filter((m) => m.tierId.toString() === tierId)
        .flatMap((m) => m.services || []);

      if (!tierServices.length) {
        continue;
      }

      for (const loc of activeLocations) {
        const locationId = loc.locationId.toString();

        for (const svc of tierServices) {
          const serviceId = svc.serviceId.toString();

          const key = `${tierId}_${locationId}_${serviceId}`;

          if (!priceSet.has(key)) {
            return false;
          }

          totalServicesValidated++;
        }
      }
    }

    return totalServicesValidated > 0;
  }
}
