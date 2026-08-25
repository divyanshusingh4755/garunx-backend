import mongoose, { Types, type ClientSession } from "mongoose";
import { Package } from "../models/package.model.js";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { Service } from "../models/service.model.js";
import { Location } from "../models/location.model.js";
import { Tier } from "../models/tier.model.js";

interface PackageTierReference {
  tierId: Types.ObjectId;
}

interface PackageLocationReference {
  locationId: Types.ObjectId;
  isActive: boolean;
}


interface PackageCascadeDocument {
  _id: Types.ObjectId;
  tiers: PackageTierReference[];
  locations: PackageLocationReference[];
  isComplete: boolean;
  isActive: boolean;
  startingPrice: number;
  save(options: { session: ClientSession; }): Promise<unknown>;
}

interface PackageMappedService {
  serviceId: Types.ObjectId;
  isRequired: boolean;
  isRelated: boolean;
}

interface PackageTierMapReference {
  _id: Types.ObjectId;
  tierId: Types.ObjectId;
  services: PackageMappedService[];
}

interface PackageTierPricingReference {
  _id: Types.ObjectId;
  tierId: Types.ObjectId;
  locationId: Types.ObjectId;
  serviceId: Types.ObjectId;
  finalPrice?: number;
}

export class PackageCascadingEngine {
  static async evaluateConfiguration(packageId: string): Promise<{ isComplete: boolean; issues: string[]; startingPrice: number; }> {
    if (!Types.ObjectId.isValid(packageId)) { throw new Error("Invalid packageId"); }

    const session = await mongoose.startSession();

    try {
      let result: { isComplete: boolean; issues: string[]; startingPrice: number; } = { isComplete: false, issues: [], startingPrice: 0 };

      await session.withTransaction(async () => {
        const packageDocument = await Package.findById(packageId).session(session);
        if (!packageDocument) { throw new Error("Package not found"); }

        const issues: string[] = [];

        // Locations
        const activeLocations = packageDocument.locations.filter((location) => location.isActive);
        if (activeLocations.length === 0) { issues.push("No active locations configured"); }

        // Tiers
        if (packageDocument.tiers.length === 0) { issues.push("No tiers configured"); }

        // Mappings
        const mappings = await PackageTierMap.find({ packageId: packageDocument._id }).session(session).select("tierId services.serviceId services.isRequired services.isRelated").lean();
        if (mappings.length === 0) { issues.push("No services mapped"); }

        const requiredServicesByTier = new Map<string, Set<string>>();

        for (const tier of packageDocument.tiers) {
          requiredServicesByTier.set(tier.tierId.toString(), new Set<string>());
        }

        for (const mapping of mappings) {
          const tierId = mapping.tierId.toString();
          let requiredServices = requiredServicesByTier.get(tierId);
          if (!requiredServices) { continue; }

          for (const service of mapping.services ?? []) {
            // Only REQUIRED services affect package completeness.
            if (service.isRequired) { requiredServices.add(service.serviceId.toString()); }
          }
        }

        // Every tier must contain at least one required service.
        for (const tier of packageDocument.tiers) {
          const requiredServices = requiredServicesByTier.get(tier.tierId.toString());
          if (!requiredServices || requiredServices.size === 0) {
            issues.push(`No required services mapped for tier ${tier.name}`);
          }
        }

        // Validate required services.
        const requiredServiceIds = [...new Set([...requiredServicesByTier.values(),].flatMap((serviceIds) => [...serviceIds])),];

        if (requiredServiceIds.length > 0) {
          const services = await Service.find({ _id: { $in: requiredServiceIds.map((id) => new Types.ObjectId(id)) } }).session(session).select("_id isActive isComplete").lean();
          if (services.length !== requiredServiceIds.length) { issues.push("One or more required services do not exist"); }

          const invalidServices = services.filter((service) => !service.isActive || !service.isComplete);
          if (invalidServices.length > 0) {
            issues.push("One or more required services are inactive or incomplete");
          }
        }

        // Pricing
        const pricing = await PackageTierPricing.find({ packageId: packageDocument._id }).session(session).select("tierId locationId serviceId finalPrice").lean();
        if (pricing.length === 0) { issues.push("No pricing configured"); }

        const priceSet = new Set(pricing.map((price) => `${price.tierId.toString()}_${price.locationId.toString()}_${price.serviceId.toString()}`));

        // Every REQUIRED service must have pricing at every ACTIVE location for every package tier.
        for (const tier of packageDocument.tiers) {
          const tierId = tier.tierId.toString();
          const requiredServices = requiredServicesByTier.get(tierId);

          if (!requiredServices || requiredServices.size === 0) { continue; }

          for (const location of activeLocations) {
            const locationId = location.locationId.toString();

            for (const serviceId of requiredServices) {
              const key = `${tierId}_${locationId}_${serviceId}`;
              if (!priceSet.has(key)) {
                issues.push(`Missing pricing for tier ${tier.name}, location ${locationId}, service ${serviceId}`);
              }
            }
          }
        }

        const isComplete = issues.length === 0;
        const startingPrice = isComplete ? await this.computeStartingPrice(packageDocument, session) : 0;
        result = { isComplete, issues: [...new Set(issues)], startingPrice };
      },
      );

      return result;
    } finally {
      await session.endSession();
    }
  }

  // Can run: 1. Inside an existing transaction. 2. Standalone with its own transaction. Package mapping/pricing mutations can therefore commit atomically with cascading changes.
  static async run(packageId: string, externalSession?: ClientSession): Promise<void> {
    if (!Types.ObjectId.isValid(packageId)) { throw new Error("Invalid packageId"); }

    // Caller already owns the transaction.
    if (externalSession) {
      await this.runInSession(packageId, externalSession);
      return;
    }

    // Standalone execution.
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => { await this.runInSession(packageId, session); });
    } finally {
      await session.endSession();
    }
  }


  private static async runInSession(packageId: string, session: ClientSession): Promise<void> {
    const packageDocument = await Package.findById(packageId).session(session);
    if (!packageDocument) { throw new Error("Package not found"); }

    // Remove stale/orphan configuration first.
    await this.cleanupTierOrphans(packageDocument, session);
    await this.cleanupLocationOrphans(packageDocument, session);
    await this.cleanupMappingOrphans(packageDocument, session);
    await this.cleanupPricing(packageDocument, session);

    // Re-read after cleanup.
    const refreshed = await Package.findById(packageId).session(session);
    if (!refreshed) { throw new Error("Package lost during cleanup"); }

    const isComplete = await this.computeIsComplete(refreshed, session);
    refreshed.isComplete = isComplete;

    // IMPORTANT: Cascading may automatically DEACTIVATE an invalid/incomplete package. It must NEVER automatically activate a package when configuration becomes complete again. Activation should remain an explicit admin operation.
    if (!isComplete) {
      refreshed.isActive = false;
      refreshed.startingPrice = 0;
    } else {
      refreshed.startingPrice = await this.computeStartingPrice(refreshed, session);
    }

    await refreshed.save({ session });
  }


  private static getValidIdStrings(values: readonly Types.ObjectId[]): string[] {
    return values.map((value) => {
      const id = value.toString();
      if (!Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid ObjectId: ${id}`,
        );
      }
      return id;
    },
    );
  }


  static async cleanupTierOrphans(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<void> {
    const validTierIds = this.getValidIdStrings(packageDocument.tiers.map((tier) => tier.tierId));

    // No tiers remain. Therefore mappings and pricing cannot remain valid.
    if (validTierIds.length === 0) {
      await Promise.all([
        PackageTierMap.deleteMany({ packageId: packageDocument._id }, { session }),
        PackageTierPricing.deleteMany({ packageId: packageDocument._id }, { session }),
      ]);

      return;
    }

    await Promise.all([
      PackageTierMap.deleteMany({ packageId: packageDocument._id, tierId: { $nin: validTierIds } }, { session }),
      PackageTierPricing.deleteMany({ packageId: packageDocument._id, tierId: { $nin: validTierIds } }, { session }),
    ]);
  }


  static async cleanupLocationOrphans(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<void> {
    const validLocationIds = this.getValidIdStrings(packageDocument.locations.map((location) => location.locationId));

    // No locations remain. Pricing cannot remain valid.
    if (validLocationIds.length === 0) {
      await PackageTierPricing.deleteMany({ packageId: packageDocument._id }, { session });
      return;
    }

    // Note: Inactive package locations are NOT deleted here. They still belong structurally to the package. Only locations completely removed from the package are considered orphans.
    await PackageTierPricing.deleteMany({ packageId: packageDocument._id, locationId: { $nin: validLocationIds } }, { session });
  }

  static async cleanupMappingOrphans(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<void> {
    await PackageTierMap.deleteMany(
      {
        packageId: packageDocument._id,
        $or: [{ tierId: { $exists: false } }, { tierId: null },],
      },
      { session },
    );
  }


  static async cleanupPricing(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<void> {
    const validTierIds = new Set(this.getValidIdStrings(packageDocument.tiers.map((tier) => tier.tierId)));
    const validLocationIds = new Set(this.getValidIdStrings(packageDocument.locations.map((location) => location.locationId)));

    // Remove structurally corrupt pricing.
    await PackageTierPricing.deleteMany(
      {
        packageId: packageDocument._id,
        $or: [
          { tierId: { $exists: false } },
          { tierId: null },
          { locationId: { $exists: false } },
          { locationId: null },
          { serviceId: { $exists: false } },
          { serviceId: null },
        ],
      },
      { session },
    );

    // Load package-tier mappings.
    const mappings = await PackageTierMap.find({ packageId: packageDocument._id }).session(session).select("tierId services.serviceId").lean<PackageTierMapReference[]>();

    // Which services are currently mapped to each tier?
    const serviceMapByTier = new Map<string, Set<string>>();

    for (const mapping of mappings) {
      const tierId = mapping.tierId.toString();
      let serviceSet = serviceMapByTier.get(tierId);

      if (!serviceSet) {
        serviceSet = new Set<string>();
        serviceMapByTier.set(tierId, serviceSet);
      }

      for (const service of mapping.services ?? []) {
        serviceSet.add(service.serviceId.toString());
      }
    }

    const pricing = await PackageTierPricing.find({ packageId: packageDocument._id }).session(session).select("_id tierId locationId serviceId").lean<PackageTierPricingReference[]>();
    const deleteIds: Types.ObjectId[] = [];

    for (const pricingRow of pricing) {
      const tierId = pricingRow.tierId.toString();
      const locationId = pricingRow.locationId.toString();
      const serviceId = pricingRow.serviceId.toString();
      const serviceSet = serviceMapByTier.get(tierId);

      // Pricing is valid only if: - tier still belongs to package - location still belongs to package - service still belongs to mapping   for this tier
      if (!validTierIds.has(tierId) || !validLocationIds.has(locationId) || !serviceSet?.has(serviceId)) {
        deleteIds.push(pricingRow._id);
      }
    }

    if (deleteIds.length > 0) {
      await PackageTierPricing.deleteMany({ _id: { $in: deleteIds } }, { session });
    }
  }

  // Calculate package starting price. Only REQUIRED services contribute. Only ACTIVE package locations contribute. Related/optional services do not form the base starting price.
  static async computeStartingPrice(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<number> {
    const activeLocationIds = new Set(packageDocument.locations.filter((location) => location.isActive).map((location) => location.locationId.toString()));
    if (activeLocationIds.size === 0) { return 0; }

    const validTierIds = new Set(packageDocument.tiers.map((tier) => tier.tierId.toString()));
    if (validTierIds.size === 0) { return 0; }

    const [mappings, pricingRows,] = await Promise.all([
      PackageTierMap.find({ packageId: packageDocument._id }).session(session).select("tierId services.serviceId services.isRequired").lean<PackageTierMapReference[]>(),
      PackageTierPricing.find({ packageId: packageDocument._id }).session(session).select("tierId locationId serviceId finalPrice").lean<PackageTierPricingReference[]>(),
    ]);

    // Required service IDs for every tier.
    const requiredServicesByTier = new Map<string, Set<string>>();

    for (const mapping of mappings) {
      const tierId = mapping.tierId.toString();

      if (!validTierIds.has(tierId)) { continue; }

      let requiredServices = requiredServicesByTier.get(tierId);
      if (!requiredServices) {
        requiredServices = new Set<string>();
        requiredServicesByTier.set(tierId, requiredServices);
      }

      for (const service of mapping.services ?? []) {
        if (service.isRequired) {
          requiredServices.add(service.serviceId.toString());
        }
      }
    }

    // Pricing lookup: tier -> location -> service -> price
    const pricingMap = new Map<string, number>();

    for (const pricing of pricingRows) {
      const tierId = pricing.tierId.toString();
      const locationId = pricing.locationId.toString();
      const serviceId = pricing.serviceId.toString();

      if (!validTierIds.has(tierId) || !activeLocationIds.has(locationId)) { continue; }
      if (typeof pricing.finalPrice !== "number" || !Number.isFinite(pricing.finalPrice)) { continue; }

      pricingMap.set(`${tierId}_${locationId}_${serviceId}`, pricing.finalPrice);
    }

    let minimumPrice = Infinity;

    for (const tier of packageDocument.tiers) {
      const tierId = tier.tierId.toString();
      const requiredServices = requiredServicesByTier.get(tierId);
      if (!requiredServices || requiredServices.size === 0) { continue; }

      for (const locationId of activeLocationIds) {
        let total = 0;
        let valid = true;

        for (const serviceId of requiredServices) {
          const price = pricingMap.get(`${tierId}_${locationId}_${serviceId}`);

          if (price === undefined) {
            valid = false;
            break;
          }

          total += price;
        }

        if (valid) {
          const rounded = Math.round((total + Number.EPSILON) * 100) / 100;
          minimumPrice = Math.min(minimumPrice, rounded);
        }
      }
    }

    return minimumPrice === Infinity ? 0 : minimumPrice;
  }


  // SINGLE SOURCE OF TRUTH for Package.isComplete. A complete package requires: - at least one active package location - at least one configured tier - every tier has at least one REQUIRED service - every required service still exists - every required service is active - every required service is complete - every required service has pricing for every   configured tier + active package location Related/optional services DO NOT block package completeness.
  static async computeIsComplete(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<boolean> {
    // 1. Package must have at least one ACTIVE    embedded location.
    const activeLocations = packageDocument.locations.filter((location) => location.isActive);
    if (activeLocations.length === 0) { return false; }

    // 2. Package must have at least one tier.
    if (packageDocument.tiers.length === 0) { return false; }

    // 3. Verify embedded ACTIVE package locations    are still globally active Locations. Example: Package has Delhi location active ↓ Admin later globally deactivates Delhi Location ↓ Package must now become incomplete.
    const activeLocationIds = activeLocations.map((location) => location.locationId);

    const globalActiveLocationCount = await Location.countDocuments({ _id: { $in: activeLocationIds }, isActive: true }).session(session);
    if (globalActiveLocationCount !== activeLocationIds.length) { return false; }

    // 4. Verify all package tiers are still    globally active Tiers.
    const tierIds = packageDocument.tiers.map((tier) => tier.tierId);

    const globalActiveTierCount = await Tier.countDocuments({ _id: { $in: tierIds }, isActive: true }).session(session);
    if (globalActiveTierCount !== tierIds.length) { return false; }

    // 5. Load package-tier mappings.
    const mappings = await PackageTierMap.find({ packageId: packageDocument._id }).session(session).select("tierId services.serviceId services.isRequired services.isRelated").lean<PackageTierMapReference[]>();

    // Required services grouped by tier.
    const requiredServicesByTier = new Map<string, Set<string>>();

    for (const mapping of mappings) {
      const tierId = mapping.tierId.toString();

      let requiredServices = requiredServicesByTier.get(tierId);
      if (!requiredServices) {
        requiredServices = new Set<string>(); requiredServicesByTier.set(tierId, requiredServices);
      }

      for (const service of mapping.services ?? []) {
        // Only REQUIRED services determine package completeness. Related services do not block package availability.
        if (service.isRequired) {
          requiredServices.add(service.serviceId.toString());
        }
      }
    }

    // 6. Every configured package tier must    contain at least one required service.
    for (const tier of packageDocument.tiers) {
      const tierId = tier.tierId.toString();

      const requiredServices = requiredServicesByTier.get(tierId);
      if (!requiredServices || requiredServices.size === 0) { return false; }
    }

    // 7. Gather all required Services.
    const requiredServiceIds = [...new Set([...requiredServicesByTier.values(),].flatMap((serviceIds) => [...serviceIds])),];
    if (requiredServiceIds.length === 0) { return false; }

    // 8. Required Services must themselves    remain active + complete.
    const activeServiceCount = await Service.countDocuments({
      _id: { $in: requiredServiceIds.map((serviceId) => new Types.ObjectId(serviceId)) },
      isActive: true,
      isComplete: true,
    }).session(session);

    if (activeServiceCount !== requiredServiceIds.length) { return false; }

    // 9. Load PackageTierPricing.
    const pricing = await PackageTierPricing.find({ packageId: packageDocument._id }).session(session).select("tierId locationId serviceId").lean<PackageTierPricingReference[]>();
    const priceSet = new Set(pricing.map((pricingRow) => `${pricingRow.tierId.toString()}_${pricingRow.locationId.toString()}_${pricingRow.serviceId.toString()}`));

    // 10. Every REQUIRED service must have     package pricing for:     every tier     ×     every active package location
    for (const tier of packageDocument.tiers) {
      const tierId = tier.tierId.toString();

      const requiredServices = requiredServicesByTier.get(tierId);
      if (!requiredServices || requiredServices.size === 0) { return false; }

      for (const location of activeLocations) {
        const locationId = location.locationId.toString();

        for (const serviceId of requiredServices) {
          const key = `${tierId}_${locationId}_${serviceId}`;
          if (!priceSet.has(key)) { return false; }
        }
      }
    }

    return true;
  }
}