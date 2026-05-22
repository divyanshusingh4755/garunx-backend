import { Types } from "mongoose";
import { Service } from "../models/service.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { Category } from "../models/category.model.js";
import { Location } from "../models/location.model.js";
import { Tier } from "../models/tier.model.js";

type Severity = "blocking" | "warning" | "info";

interface DiagnosticIssue {
  code: string;
  message: string;
  severity: Severity;
  meta?: any;
}

export class ServiceDiagnosticsEngine {
  static async analyze(serviceId: string) {
    if (!Types.ObjectId.isValid(serviceId)) {
      throw new Error("Invalid serviceId");
    }

    const service = await Service.findById(serviceId).lean();
    if (!service) throw new Error("Service not found");

    const [category, components, pricing, tiers, locations] = await Promise.all(
      [
        Category.findById(service.categoryId).lean(),
        ServiceComponent.find({ serviceId }).lean(),
        ServicePricing.find({ serviceId }).lean(),
        Tier.find({}).lean(),
        Location.find({}).lean(),
      ],
    );

    const tierMap = new Map(tiers.map((t) => [t._id.toString(), t.name]));

    const locationMap = new Map(
      locations.map((l) => [l._id.toString(), l.name]),
    );

    const componentMap = new Map(
      components.map((c) => [c.componentId.toString(), c.name]),
    );

    const issues: DiagnosticIssue[] = [];

    if (!service.isActive) {
      issues.push({
        code: "SERVICE_INACTIVE",
        message: `Service "${service.name}" is inactive`,
        severity: "blocking",
        meta: {
          serviceId: service._id,
          serviceName: service.name,
        },
      });
    }

    if (!service.thumbnailImage) {
      issues.push({
        code: "MISSING_THUMBNAIL",
        message: `Thumbnail missing for "${service.name}"`,
        severity: "warning",
      });
    }

    if (!category) {
      issues.push({
        code: "CATEGORY_NOT_FOUND",
        message: `Category not found for "${service.name}"`,
        severity: "blocking",
      });
    } else if (!category.isActive) {
      issues.push({
        code: "CATEGORY_INACTIVE",
        message: `Category "${category.label}" is inactive`,
        severity: "blocking",
        meta: {
          categoryId: category._id,
          categoryName: category.label,
        },
      });
    }

    const serviceLocationIds =
      service.locations?.map((l: any) => l.locationId.toString()) || [];

    const activeServiceLocations = service.locations.filter(
      (l: any) => l.isActive,
    );

    if (!serviceLocationIds.length) {
      issues.push({
        code: "NO_LOCATIONS",
        message: `No locations configured for "${service.name}"`,
        severity: "blocking",
      });
    }

    const invalidLocations = serviceLocationIds.filter(
      (id) => !locationMap.has(id),
    );

    if (invalidLocations.length) {
      issues.push({
        code: "INVALID_LOCATIONS",
        message: "Some locations are missing or inactive",
        severity: "blocking",
        meta: invalidLocations.map((id) => ({
          locationId: id,
          locationName: locationMap.get(id) || "UNKNOWN",
        })),
      });
    }

    const serviceTierIds = service.tiers.map((t: any) => t.tierId.toString());

    if (!serviceTierIds.length) {
      issues.push({
        code: "NO_TIERS",
        message: `No tiers configured for "${service.name}"`,
        severity: "blocking",
      });
    }

    const orphanComponents = components.filter(
      (c) => !serviceTierIds.includes(c.tierId.toString()),
    );

    if (orphanComponents.length) {
      issues.push({
        code: "ORPHAN_COMPONENTS",
        message: `${orphanComponents.length} components belong to deleted tiers`,
        severity: "warning",
        meta: orphanComponents.map((c) => ({
          componentId: c.componentId,
          componentName:
            componentMap.get(c.componentId.toString()) || "UNKNOWN",
          tierId: c.tierId,
          tierName: tierMap.get(c.tierId.toString()) || "UNKNOWN",
        })),
      });
    }

    const requiredComponents = components.filter((c) => c.isRequired);

    const priceSet = new Set(
      pricing.map(
        (p) =>
          `${p.tierId.toString()}_${p.locationId.toString()}_${p.componentId.toString()}`,
      ),
    );

    const missingPricing: any[] = [];

    for (const tier of service.tiers) {
      const tierId = tier.tierId.toString();

      const tierComponents = requiredComponents.filter(
        (c) => c.tierId.toString() === tierId,
      );

      if (!tierComponents.length) continue;

      for (const loc of activeServiceLocations) {
        const locationId = loc.locationId.toString();

        for (const comp of tierComponents) {
          const componentId = comp.componentId.toString();

          const key = `${tierId}_${locationId}_${componentId}`;

          if (!priceSet.has(key)) {
            missingPricing.push({
              tier: {
                id: tierId,
                name: tierMap.get(tierId) || "UNKNOWN",
              },
              location: {
                id: locationId,
                name: locationMap.get(locationId) || "UNKNOWN",
              },
              component: {
                id: componentId,
                name: componentMap.get(componentId) || "UNKNOWN",
              },
            });
          }
        }
      }
    }

    if (missingPricing.length) {
      issues.push({
        code: "MISSING_PRICING",
        message:
          "Pricing is missing for some tier/location/component combinations",
        severity: "blocking",
        meta: {
          count: missingPricing.length,
          samples: missingPricing.slice(0, 10),
        },
      });
    }

    const blockingIssues = issues.filter((i) => i.severity === "blocking");

    const isComplete = blockingIssues.length === 0;
    const isActive = isComplete && service.isActive;

    return {
      serviceId,
      serviceName: service.name,
      isActive,
      isComplete,
      summary: {
        totalIssues: issues.length,
        blocking: blockingIssues.length,
        warnings: issues.filter((i) => i.severity === "warning").length,
      },
      issues,
    };
  }
}
