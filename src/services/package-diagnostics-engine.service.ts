import { Types } from "mongoose";

import { Package } from "../models/package.model.js";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { Service } from "../models/service.model.js";
import { Location } from "../models/location.model.js";

type Severity = "blocking" | "warning" | "info";

interface DiagnosticIssue {
  code: string;
  message: string;
  severity: Severity;
  meta?: any;
}

export class PackageDiagnosticsEngine {
  static async analyze(packageId: string) {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    const pkg = await Package.findById(packageId).lean();
    if (!pkg) throw new Error("Package not found");

    const [mappings, pricing, locations, services] = await Promise.all([
      PackageTierMap.find({ packageId }).lean(),
      PackageTierPricing.find({ packageId }).lean(),
      Location.find({}).lean(),
      Service.find({}).lean(),
    ]);

    const issues: DiagnosticIssue[] = [];

    const locationMap = new Map(
      locations.map((l) => [l._id.toString(), l.name]),
    );

    const serviceMap = new Map(services.map((s) => [s._id.toString(), s.name]));

    if (!pkg.isActive) {
      issues.push({
        code: "PACKAGE_INACTIVE",
        message: `Package "${pkg.name}" is inactive`,
        severity: "blocking",
      });
    }

    if (!pkg.tiers.length) {
      issues.push({
        code: "NO_TIERS",
        message: `No tiers configured for package "${pkg.name}"`,
        severity: "blocking",
      });
    }

    const activeLocations = pkg.locations.filter((l: any) => l.isActive);

    if (!activeLocations.length) {
      issues.push({
        code: "NO_ACTIVE_LOCATIONS",
        message: "No active locations configured",
        severity: "blocking",
      });
    }

    const tierIds = new Set(pkg.tiers.map((t: any) => t.tierId.toString()));

    const orphanMappings = mappings.filter(
      (m) => !tierIds.has(m.tierId.toString()),
    );

    if (orphanMappings.length) {
      issues.push({
        code: "ORPHAN_SERVICE_MAPPINGS",
        message: "Some services belong to deleted tiers",
        severity: "warning",
        meta: orphanMappings.slice(0, 10).map((m) => ({
          tierId: m.tierId,
          serviceId: m.serviceId,
          serviceName: serviceMap.get(m.serviceId.toString()) || "UNKNOWN",
        })),
      });
    }

    /* ----------------------------
     * 3. INVALID SERVICES
     * ---------------------------- */
    const invalidServices = mappings.filter(
      (m) => !serviceMap.has(m.serviceId.toString()),
    );

    if (invalidServices.length) {
      issues.push({
        code: "INVALID_SERVICES",
        message: "Some mapped services are missing or deleted",
        severity: "blocking",
        meta: invalidServices.slice(0, 10).map((m) => ({
          serviceId: m.serviceId,
        })),
      });
    }

    const requiredServices = mappings.filter((m) => m.isRequired);

    const priceSet = new Set(
      pricing.map(
        (p) =>
          `${p.tierId.toString()}_${p.locationId.toString()}_${p.serviceId.toString()}`,
      ),
    );

    const missingPricing: any[] = [];

    for (const tier of pkg.tiers) {
      const tierId = tier.tierId.toString();

      const tierServices = requiredServices.filter(
        (m) => m.tierId.toString() === tierId,
      );

      if (!tierServices.length) continue;

      for (const loc of activeLocations) {
        const locationId = loc.locationId.toString();

        for (const svc of tierServices) {
          const serviceId = svc.serviceId.toString();

          const key = `${tierId}_${locationId}_${serviceId}`;

          if (!priceSet.has(key)) {
            missingPricing.push({
              tier: {
                id: tierId,
                name: tier.name,
              },
              location: {
                id: locationId,
                name: locationMap.get(locationId) || "UNKNOWN",
              },
              service: {
                id: serviceId,
                name: serviceMap.get(serviceId) || "UNKNOWN",
              },
            });
          }
        }
      }
    }

    if (missingPricing.length) {
      issues.push({
        code: "MISSING_PRICING",
        message: "Missing pricing for required service combinations",
        severity: "blocking",
        meta: {
          count: missingPricing.length,
          samples: missingPricing.slice(0, 10),
        },
      });
    }

    const blockingIssues = issues.filter((i) => i.severity === "blocking");
    const warnings = issues.filter((i) => i.severity === "warning");

    const isComplete = blockingIssues.length === 0;
    const isActive = isComplete && pkg.isActive;

    return {
      packageId,
      packageName: pkg.name,
      isActive,
      isComplete,

      summary: {
        totalIssues: issues.length,
        blocking: blockingIssues.length,
        warnings: warnings.length,
      },

      issues,
    };
  }
}
