import { Types } from "mongoose";
import { Package } from "../models/package.model.js";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { Service } from "../models/service.model.js";
import { Location } from "../models/location.model.js";
import { Tier } from "../models/tier.model.js";

type Severity = "blocking" | "warning" | "info";
type DiagnosticMeta = Record<string, unknown> | readonly unknown[];

interface DiagnosticIssue {
  code: string;
  message: string;
  severity: Severity;
  meta?: DiagnosticMeta;
}

interface PackageTierReference {
  tierId: Types.ObjectId;
}

interface PackageLocationReference {
  locationId: Types.ObjectId;
  isActive: boolean;
}

interface PackageDiagnosticDocument {
  _id: Types.ObjectId;
  name: string;
  isActive: boolean;
  tiers: PackageTierReference[];
  locations: PackageLocationReference[];
}

interface NamedDocument {
  _id: Types.ObjectId;
  name: string;
  isActive?: boolean;
}

interface MappedService {
  serviceId: Types.ObjectId;
  isRequired?: boolean;
  name?: string;
}

interface TierMappingDocument {
  _id: Types.ObjectId;
  tierId: Types.ObjectId;
  services: MappedService[];
}

interface PackagePricingDocument {
  _id: Types.ObjectId;
  tierId: Types.ObjectId;
  locationId: Types.ObjectId;
  serviceId: Types.ObjectId;
}

interface MissingPackagePricing {
  tier: { id: string; name: string; };
  location: { id: string; name: string; };
  service: { id: string; name: string; };
}

export interface PackageDiagnosticResult {
  packageId: string;
  packageName: string;
  isActive: boolean;
  isComplete: boolean;
  summary: { totalIssues: number; blocking: number; warnings: number; info: number; };
  issues: DiagnosticIssue[];
}

export class PackageDiagnosticsEngine {
  private static safeObjectIdString(value: unknown): string | null {
    if (value instanceof Types.ObjectId) { return value.toString(); }
    if (typeof value === "string" && Types.ObjectId.isValid(value)) { return value; }
    return null;
  }

  private static findDuplicates(values: readonly string[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const value of values) {
      if (seen.has(value)) { duplicates.add(value); }
      else { seen.add(value); }
    }

    return [...duplicates];
  }

  static async analyze(packageId: string): Promise<PackageDiagnosticResult> {
    if (!Types.ObjectId.isValid(packageId)) { throw new Error("Invalid packageId"); }

    const packageDocument = await Package.findById(packageId).lean<PackageDiagnosticDocument>();
    if (!packageDocument) { throw new Error("Package not found"); }

    const packageTierIds = packageDocument.tiers.map((tier) => this.safeObjectIdString(tier.tierId)).filter((id): id is string => id !== null);
    const packageLocationIds = packageDocument.locations.map((location) => this.safeObjectIdString(location.locationId)).filter((id): id is string => id !== null);

    const [mappings, pricing, locations, tiers] = await Promise.all([
      PackageTierMap.find({ packageId: packageDocument._id }).lean<TierMappingDocument[]>(),
      PackageTierPricing.find({ packageId: packageDocument._id }).lean<PackagePricingDocument[]>(),

      packageLocationIds.length > 0 ? Location.find({ _id: { $in: packageLocationIds } }).lean<NamedDocument[]>() : Promise.resolve([] as NamedDocument[]),
      packageTierIds.length > 0 ? Tier.find({ _id: { $in: packageTierIds } }).lean<NamedDocument[]>() : Promise.resolve([] as NamedDocument[]),
    ]);

    const mappedServiceIds = [...new Set(mappings.flatMap((mapping) =>
      (mapping.services ?? []).map((service) =>
        this.safeObjectIdString(service.serviceId)).filter((id): id is string => id !== null),
    )),
    ];

    const services = mappedServiceIds.length > 0 ? await Service.find({ _id: { $in: mappedServiceIds } }).select("name isActive").lean<NamedDocument[]>() : [];
    const issues: DiagnosticIssue[] = [];

    const locationMap = new Map(locations.map((location) => [location._id.toString(), location]));
    const tierMap = new Map(tiers.map((tier) => [tier._id.toString(), tier.name]));
    const serviceMap = new Map(services.map((service) => [service._id.toString(), service]));

    // Package status is reported separately from structural completeness. Inactive must not automatically mean incomplete.
    if (!packageDocument.isActive) {
      issues.push({ code: "PACKAGE_INACTIVE", message: `Package "${packageDocument.name}" is inactive`, severity: "info" });
    }

    if (packageDocument.tiers.length === 0) {
      issues.push({ code: "NO_TIERS", message: `No tiers configured for package "${packageDocument.name}"`, severity: "blocking" });
    }

    const malformedTiers = packageDocument.tiers.filter((tier) => this.safeObjectIdString(tier.tierId) === null);

    if (malformedTiers.length > 0) {
      issues.push({ code: "MALFORMED_TIERS", message: "Some package tiers contain invalid IDs", severity: "blocking", meta: { count: malformedTiers.length } });
    }

    const duplicateTierIds = this.findDuplicates(packageTierIds);
    if (duplicateTierIds.length > 0) {
      issues.push({
        code: "DUPLICATE_TIERS",
        message: "Some package tiers are configured more than once",
        severity: "blocking",
        meta: duplicateTierIds.map((tierId) => ({ tierId, tierName: tierMap.get(tierId) ?? "UNKNOWN" })),
      });
    }

    const missingTierIds = packageTierIds.filter((tierId) => !tierMap.has(tierId));
    if (missingTierIds.length > 0) {
      issues.push({
        code: "INVALID_TIERS",
        message: "Some configured tiers are missing or deleted",
        severity: "blocking",
        meta: missingTierIds.map((tierId) => ({ tierId, tierName: "UNKNOWN" })),
      });
    }

    const malformedLocations = packageDocument.locations.filter((location) => this.safeObjectIdString(location.locationId) === null);
    if (malformedLocations.length > 0) {
      issues.push({
        code: "MALFORMED_LOCATIONS",
        message: "Some package locations contain invalid IDs",
        severity: "blocking",
        meta: { count: malformedLocations.length },
      });
    }

    const duplicateLocationIds = this.findDuplicates(packageLocationIds);
    if (duplicateLocationIds.length > 0) {
      issues.push({
        code: "DUPLICATE_LOCATIONS",
        message: "Some package locations are configured more than once",
        severity: "blocking",
        meta: duplicateLocationIds.map((locationId) => ({ locationId, locationName: locationMap.get(locationId)?.name ?? "UNKNOWN" })),
      });
    }

    const missingLocationIds = packageLocationIds.filter((locationId) => !locationMap.has(locationId));
    if (missingLocationIds.length > 0) {
      issues.push({
        code: "INVALID_LOCATIONS",
        message: "Some configured package locations are missing or deleted",
        severity: "blocking",
        meta: missingLocationIds.map((locationId) => ({ locationId, locationName: "UNKNOWN" })),
      });
    }

    const activeLocations = packageDocument.locations.filter((location) => location.isActive && this.safeObjectIdString(location.locationId) !== null);
    if (activeLocations.length === 0) {
      issues.push({ code: "NO_ACTIVE_LOCATIONS", message: "No active locations configured", severity: "blocking" });
    }

    const inactiveMasterLocations = activeLocations.map((location) => this.safeObjectIdString(location.locationId)).filter((id): id is string => id !== null).filter((locationId) => {
      const location = locationMap.get(locationId);
      return location !== undefined && location.isActive === false;
    });

    if (inactiveMasterLocations.length > 0) {
      issues.push({
        code: "INACTIVE_MASTER_LOCATIONS",
        message: "Some active package locations are inactive in the location master",
        severity: "blocking",
        meta: inactiveMasterLocations.map((locationId) => ({ locationId, locationName: locationMap.get(locationId)?.name ?? "UNKNOWN" })),
      });
    }

    const orphanMappings = mappings.filter((mapping) => !packageTierIds.includes(mapping.tierId.toString()));
    if (orphanMappings.length > 0) {
      issues.push({
        code: "ORPHAN_SERVICE_MAPPINGS",
        message: "Some service mappings belong to deleted tiers",
        severity: "warning",
        meta: orphanMappings.slice(0, 10).flatMap((mapping) =>
          (mapping.services ?? []).map((service) => {
            const serviceId = this.safeObjectIdString(service.serviceId);
            return {
              tierId: mapping.tierId.toString(),
              serviceId: serviceId ?? "INVALID",
              serviceName: serviceId ? (serviceMap.get(serviceId)?.name ?? "UNKNOWN") : "UNKNOWN",
            };
          }),
        ),
      });
    }

    const validMappings = mappings.filter((mapping) => packageTierIds.includes(mapping.tierId.toString()));
    const mappingTierIds = validMappings.map((mapping) => mapping.tierId.toString());

    const duplicateMappingTierIds = this.findDuplicates(mappingTierIds);
    if (duplicateMappingTierIds.length > 0) {
      issues.push({
        code: "DUPLICATE_TIER_MAPPINGS",
        message: "More than one package mapping exists for the same tier",
        severity: "blocking",
        meta: duplicateMappingTierIds.map((tierId) => ({ tierId, tierName: tierMap.get(tierId) ?? "UNKNOWN" })),
      });
    }

    const tiersWithoutServices = packageTierIds.filter((tierId) => {
      const tierServices = validMappings.filter((mapping) => mapping.tierId.toString() === tierId).flatMap((mapping) => mapping.services ?? []);
      return tierServices.length === 0;
    });

    if (tiersWithoutServices.length > 0) {
      issues.push({
        code: "TIERS_WITHOUT_SERVICES",
        message: "Some package tiers have no mapped services",
        severity: "blocking",
        meta: tiersWithoutServices.map((tierId) => ({ tierId, tierName: tierMap.get(tierId) ?? "UNKNOWN" })),
      });
    }

    const allMappedServices = validMappings.flatMap((mapping) => (mapping.services ?? []).map((service) => ({ tierId: mapping.tierId, serviceId: service.serviceId })));

    const malformedServices = allMappedServices.filter((service) => this.safeObjectIdString(service.serviceId) === null);
    if (malformedServices.length > 0) {
      issues.push({
        code: "MALFORMED_SERVICES",
        message: "Some mapped services contain invalid IDs",
        severity: "blocking",
        meta: { count: malformedServices.length },
      });
    }

    const invalidServices = allMappedServices.filter((service) => {
      const serviceId = this.safeObjectIdString(service.serviceId);
      return serviceId !== null && !serviceMap.has(serviceId);
    });

    if (invalidServices.length > 0) {
      issues.push({
        code: "INVALID_SERVICES",
        message: "Some mapped services are missing or deleted",
        severity: "blocking",
        meta: invalidServices.slice(0, 10).map((service) => ({ serviceId: service.serviceId.toString() })),
      });
    }

    const inactiveServices = allMappedServices.map((service) => this.safeObjectIdString(service.serviceId)).filter((id): id is string => id !== null).filter((serviceId) => {
      const service = serviceMap.get(serviceId);
      return service !== undefined && service.isActive === false;
    });

    if (inactiveServices.length > 0) {
      issues.push({
        code: "INACTIVE_SERVICES",
        message: "Some mapped services are inactive",
        severity: "blocking",
        meta: [...new Set(inactiveServices)].map((serviceId) => ({ serviceId, serviceName: serviceMap.get(serviceId)?.name ?? "UNKNOWN" })),
      });
    }

    const mappedCombinationKeys = allMappedServices.map((service) => {
      const serviceId = this.safeObjectIdString(service.serviceId);
      return serviceId ? `${service.tierId.toString()}_${serviceId}` : null;
    }).filter((key): key is string => key !== null);

    const duplicateMappedServices = this.findDuplicates(mappedCombinationKeys);
    if (duplicateMappedServices.length > 0) {
      issues.push({
        code: "DUPLICATE_MAPPED_SERVICES",
        message: "Some services are mapped more than once in the same tier",
        severity: "blocking",
        meta: { count: duplicateMappedServices.length, samples: duplicateMappedServices.slice(0, 10) },
      });
    }

    const pricingKeys = pricing.map((pricingRow) => `${pricingRow.tierId.toString()}_${pricingRow.locationId.toString()}_${pricingRow.serviceId.toString()}`);

    const duplicatePricingKeys = this.findDuplicates(pricingKeys);
    if (duplicatePricingKeys.length > 0) {
      issues.push({
        code: "DUPLICATE_PRICING",
        message: "Duplicate package pricing rows exist",
        severity: "blocking",
        meta: { count: duplicatePricingKeys.length, samples: duplicatePricingKeys.slice(0, 10) },
      });
    }

    const priceSet = new Set(pricingKeys);
    const missingPricing: MissingPackagePricing[] = [];

    for (const tier of packageDocument.tiers) {
      const tierId = this.safeObjectIdString(tier.tierId);

      if (!tierId) { continue; }

      // This intentionally checks every mapped service. PackageCascadingEngine also requires pricing for every mapped service, regardless of isRequired.
      const tierServices = validMappings.filter((mapping) => mapping.tierId.toString() === tierId).flatMap((mapping) => mapping.services ?? []);

      for (const location of activeLocations) {
        const locationId = this.safeObjectIdString(location.locationId);
        if (!locationId) { continue; }

        for (const service of tierServices) {
          const serviceId = this.safeObjectIdString(service.serviceId);
          if (!serviceId) { continue; }

          const key = `${tierId}_${locationId}_${serviceId}`;
          if (!priceSet.has(key)) {
            missingPricing.push({
              tier: { id: tierId, name: tierMap.get(tierId) ?? "UNKNOWN" },
              location: { id: locationId, name: locationMap.get(locationId)?.name ?? "UNKNOWN" },
              service: { id: serviceId, name: serviceMap.get(serviceId)?.name ?? "UNKNOWN" },
            });
          }
        }
      }
    }

    if (missingPricing.length > 0) {
      issues.push({
        code: "MISSING_PRICING",
        message: "Missing pricing for mapped service combinations",
        severity: "blocking",
        meta: { count: missingPricing.length, samples: missingPricing.slice(0, 10) },
      });
    }

    const blockingIssues = issues.filter((issue) => issue.severity === "blocking");
    const warnings = issues.filter((issue) => issue.severity === "warning");
    const info = issues.filter((issue) => issue.severity === "info");
    const isComplete = blockingIssues.length === 0;

    return {
      packageId,
      packageName: packageDocument.name,
      isActive: packageDocument.isActive,
      isComplete,
      summary: { totalIssues: issues.length, blocking: blockingIssues.length, warnings: warnings.length, info: info.length },
      issues,
    };
  }
}
