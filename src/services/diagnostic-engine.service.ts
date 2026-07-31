import {
  Types,
} from "mongoose";

import {
  Service,
} from "../models/service.model.js";

import {
  ServiceComponent,
} from "../models/servicecomponent.model.js";

import {
  ServicePricing,
} from "../models/servicepricing.model.js";

import {
  Category,
} from "../models/category.model.js";

import {
  Location,
} from "../models/location.model.js";

import {
  Tier,
} from "../models/tier.model.js";

type Severity =
  | "blocking"
  | "warning"
  | "info";

type DiagnosticMeta =
  | Record<string, unknown>
  | readonly unknown[];

interface DiagnosticIssue {
  code: string;
  message: string;
  severity: Severity;
  meta?: DiagnosticMeta;
}

interface ServiceTierReference {
  tierId: Types.ObjectId;
}

interface ServiceLocationReference {
  locationId: Types.ObjectId;
  isActive: boolean;
}

interface ServiceDiagnosticDocument {
  _id: Types.ObjectId;
  name: string;
  categoryId: Types.ObjectId;
  thumbnailImage?: string | null;
  isActive: boolean;
  tiers: ServiceTierReference[];
  locations: ServiceLocationReference[];
}

interface NamedDocument {
  _id: Types.ObjectId;
  name: string;
  isActive?: boolean;
}

interface CategoryDocument {
  _id: Types.ObjectId;
  label: string;
  isActive: boolean;
}

interface ComponentDocument {
  _id: Types.ObjectId;
  tierId: Types.ObjectId;
  componentId: Types.ObjectId;
  name: string;
  isRequired: boolean;
}

interface PricingDocument {
  _id: Types.ObjectId;
  tierId: Types.ObjectId;
  locationId: Types.ObjectId;
  componentId: Types.ObjectId;
}

interface MissingServicePricing {
  tier: {
    id: string;
    name: string;
  };
  location: {
    id: string;
    name: string;
  };
  component: {
    id: string;
    name: string;
  };
}

export interface ServiceDiagnosticResult {
  serviceId: string;
  serviceName: string;
  isActive: boolean;
  isComplete: boolean;
  summary: {
    totalIssues: number;
    blocking: number;
    warnings: number;
    info: number;
  };
  issues: DiagnosticIssue[];
}

export class ServiceDiagnosticsEngine {
  private static safeObjectIdString(
    value: unknown,
  ): string | null {
    if (
      value instanceof Types.ObjectId
    ) {
      return value.toString();
    }

    if (
      typeof value === "string" &&
      Types.ObjectId.isValid(value)
    ) {
      return value;
    }

    return null;
  }

  private static findDuplicates(
    values: readonly string[],
  ): string[] {
    const seen = new Set<string>();
    const duplicates =
      new Set<string>();

    for (const value of values) {
      if (seen.has(value)) {
        duplicates.add(value);
      } else {
        seen.add(value);
      }
    }

    return [...duplicates];
  }

  static async analyze(
    serviceId: string,
  ): Promise<ServiceDiagnosticResult> {
    if (
      !Types.ObjectId.isValid(
        serviceId,
      )
    ) {
      throw new Error(
        "Invalid serviceId",
      );
    }

    const service =
      await Service.findById(
        serviceId,
      ).lean<ServiceDiagnosticDocument>();

    if (!service) {
      throw new Error(
        "Service not found",
      );
    }

    const serviceTierIds =
      service.tiers
        .map((tier) =>
          this.safeObjectIdString(
            tier.tierId,
          ),
        )
        .filter(
          (
            id,
          ): id is string =>
            id !== null,
        );

    const serviceLocationIds =
      service.locations
        .map((location) =>
          this.safeObjectIdString(
            location.locationId,
          ),
        )
        .filter(
          (
            id,
          ): id is string =>
            id !== null,
        );

    const [
      category,
      components,
      pricing,
      tiers,
      locations,
    ] = await Promise.all([
      Category.findById(
        service.categoryId,
      ).lean<CategoryDocument>(),

      ServiceComponent.find({
        serviceId:
          service._id,
      }).lean<ComponentDocument[]>(),

      ServicePricing.find({
        serviceId:
          service._id,
      }).lean<PricingDocument[]>(),

      serviceTierIds.length > 0
        ? Tier.find({
            _id: {
              $in:
                serviceTierIds,
            },
          }).lean<NamedDocument[]>()
        : Promise.resolve(
            [] as NamedDocument[],
          ),

      serviceLocationIds.length > 0
        ? Location.find({
            _id: {
              $in:
                serviceLocationIds,
            },
          }).lean<NamedDocument[]>()
        : Promise.resolve(
            [] as NamedDocument[],
          ),
    ]);

    const tierMap =
      new Map(
        tiers.map((tier) => [
          tier._id.toString(),
          tier.name,
        ]),
      );

    const locationMap =
      new Map(
        locations.map(
          (location) => [
            location._id.toString(),
            location,
          ],
        ),
      );

    const componentMap =
      new Map(
        components.map(
          (component) => [
            component.componentId
              .toString(),
            component.name,
          ],
        ),
      );

    const issues:
      DiagnosticIssue[] = [];

    /*
     * Inactive status is informational. Treating it as
     * blocking made an otherwise complete service report
     * itself as incomplete merely because it was disabled.
     */
    if (!service.isActive) {
      issues.push({
        code:
          "SERVICE_INACTIVE",
        message:
          `Service "${service.name}" is inactive`,
        severity: "info",
        meta: {
          serviceId:
            service._id.toString(),
          serviceName:
            service.name,
        },
      });
    }

    if (
      !service.thumbnailImage
    ) {
      issues.push({
        code:
          "MISSING_THUMBNAIL",
        message:
          `Thumbnail missing for "${service.name}"`,
        severity: "warning",
      });
    }

    if (!category) {
      issues.push({
        code:
          "CATEGORY_NOT_FOUND",
        message:
          `Category not found for "${service.name}"`,
        severity: "blocking",
      });
    } else if (
      !category.isActive
    ) {
      issues.push({
        code:
          "CATEGORY_INACTIVE",
        message:
          `Category "${category.label}" is inactive`,
        severity: "blocking",
        meta: {
          categoryId:
            category._id.toString(),
          categoryName:
            category.label,
        },
      });
    }

    if (
      service.locations.length ===
      0
    ) {
      issues.push({
        code:
          "NO_LOCATIONS",
        message:
          `No locations configured for "${service.name}"`,
        severity: "blocking",
      });
    }

    const malformedLocations =
      service.locations.filter(
        (location) =>
          this.safeObjectIdString(
            location.locationId,
          ) === null,
      );

    if (
      malformedLocations.length >
      0
    ) {
      issues.push({
        code:
          "MALFORMED_LOCATIONS",
        message:
          "Some service locations contain invalid IDs",
        severity: "blocking",
        meta: {
          count:
            malformedLocations.length,
        },
      });
    }

    const duplicateLocationIds =
      this.findDuplicates(
        serviceLocationIds,
      );

    if (
      duplicateLocationIds.length >
      0
    ) {
      issues.push({
        code:
          "DUPLICATE_LOCATIONS",
        message:
          "Some locations are configured more than once",
        severity: "blocking",
        meta:
          duplicateLocationIds.map(
            (locationId) => ({
              locationId,
              locationName:
                locationMap.get(
                  locationId,
                )?.name ??
                "UNKNOWN",
            }),
          ),
      });
    }

    const missingLocations =
      serviceLocationIds.filter(
        (locationId) =>
          !locationMap.has(
            locationId,
          ),
      );

    if (
      missingLocations.length > 0
    ) {
      issues.push({
        code:
          "INVALID_LOCATIONS",
        message:
          "Some configured locations are missing or deleted",
        severity: "blocking",
        meta:
          missingLocations.map(
            (locationId) => ({
              locationId,
              locationName:
                "UNKNOWN",
            }),
          ),
      });
    }

    const inactiveConfiguredLocations =
      service.locations
        .filter(
          (location) =>
            location.isActive,
        )
        .map((location) =>
          this.safeObjectIdString(
            location.locationId,
          ),
        )
        .filter(
          (
            id,
          ): id is string =>
            id !== null,
        )
        .filter((locationId) => {
          const location =
            locationMap.get(
              locationId,
            );

          return (
            location !== undefined &&
            location.isActive ===
              false
          );
        });

    if (
      inactiveConfiguredLocations.length >
      0
    ) {
      issues.push({
        code:
          "INACTIVE_MASTER_LOCATIONS",
        message:
          "Some active service locations are inactive in the location master",
        severity: "blocking",
        meta:
          inactiveConfiguredLocations.map(
            (locationId) => ({
              locationId,
              locationName:
                locationMap.get(
                  locationId,
                )?.name ??
                "UNKNOWN",
            }),
          ),
      });
    }

    const activeServiceLocations =
      service.locations.filter(
        (location) =>
          location.isActive &&
          this.safeObjectIdString(
            location.locationId,
          ) !== null,
      );

    if (
      activeServiceLocations.length ===
      0
    ) {
      issues.push({
        code:
          "NO_ACTIVE_LOCATIONS",
        message:
          "No active service locations configured",
        severity: "blocking",
      });
    }

    if (
      service.tiers.length === 0
    ) {
      issues.push({
        code:
          "NO_TIERS",
        message:
          `No tiers configured for "${service.name}"`,
        severity: "blocking",
      });
    }

    const malformedTiers =
      service.tiers.filter(
        (tier) =>
          this.safeObjectIdString(
            tier.tierId,
          ) === null,
      );

    if (
      malformedTiers.length > 0
    ) {
      issues.push({
        code:
          "MALFORMED_TIERS",
        message:
          "Some service tiers contain invalid IDs",
        severity: "blocking",
        meta: {
          count:
            malformedTiers.length,
        },
      });
    }

    const duplicateTierIds =
      this.findDuplicates(
        serviceTierIds,
      );

    if (
      duplicateTierIds.length > 0
    ) {
      issues.push({
        code:
          "DUPLICATE_TIERS",
        message:
          "Some tiers are configured more than once",
        severity: "blocking",
        meta:
          duplicateTierIds.map(
            (tierId) => ({
              tierId,
              tierName:
                tierMap.get(
                  tierId,
                ) ??
                "UNKNOWN",
            }),
          ),
      });
    }

    const missingTierIds =
      serviceTierIds.filter(
        (tierId) =>
          !tierMap.has(tierId),
      );

    if (
      missingTierIds.length > 0
    ) {
      issues.push({
        code:
          "INVALID_TIERS",
        message:
          "Some configured tiers are missing or deleted",
        severity: "blocking",
        meta:
          missingTierIds.map(
            (tierId) => ({
              tierId,
              tierName:
                "UNKNOWN",
            }),
          ),
      });
    }

    const orphanComponents =
      components.filter(
        (component) =>
          !serviceTierIds.includes(
            component.tierId
              .toString(),
          ),
      );

    if (
      orphanComponents.length > 0
    ) {
      issues.push({
        code:
          "ORPHAN_COMPONENTS",
        message:
          `${orphanComponents.length} components belong to deleted tiers`,
        severity: "warning",
        meta:
          orphanComponents
            .slice(0, 10)
            .map(
              (component) => ({
                componentId:
                  component.componentId
                    .toString(),
                componentName:
                  componentMap.get(
                    component.componentId
                      .toString(),
                  ) ??
                  "UNKNOWN",
                tierId:
                  component.tierId
                    .toString(),
                tierName:
                  tierMap.get(
                    component.tierId
                      .toString(),
                  ) ??
                  "UNKNOWN",
              }),
            ),
      });
    }

    const requiredComponents =
      components.filter(
        (component) =>
          component.isRequired &&
          serviceTierIds.includes(
            component.tierId
              .toString(),
          ),
      );

    const tiersWithoutRequiredComponents =
      serviceTierIds.filter(
        (tierId) =>
          !requiredComponents.some(
            (component) =>
              component.tierId
                .toString() ===
              tierId,
          ),
      );

    if (
      tiersWithoutRequiredComponents
        .length > 0
    ) {
      issues.push({
        code:
          "TIERS_WITHOUT_REQUIRED_COMPONENTS",
        message:
          "Some configured tiers have no required components",
        severity: "blocking",
        meta:
          tiersWithoutRequiredComponents.map(
            (tierId) => ({
              tierId,
              tierName:
                tierMap.get(
                  tierId,
                ) ??
                "UNKNOWN",
            }),
          ),
      });
    }

    const pricingKeys =
      pricing.map(
        (pricingRow) =>
          `${pricingRow.tierId.toString()}_${pricingRow.locationId.toString()}_${pricingRow.componentId.toString()}`,
      );

    const duplicatePricingKeys =
      this.findDuplicates(
        pricingKeys,
      );

    if (
      duplicatePricingKeys.length > 0
    ) {
      issues.push({
        code:
          "DUPLICATE_PRICING",
        message:
          "Duplicate service pricing rows exist",
        severity: "blocking",
        meta: {
          count:
            duplicatePricingKeys.length,
          samples:
            duplicatePricingKeys.slice(
              0,
              10,
            ),
        },
      });
    }

    const priceSet =
      new Set(pricingKeys);

    const missingPricing:
      MissingServicePricing[] = [];

    for (
      const tier of
      service.tiers
    ) {
      const tierId =
        this.safeObjectIdString(
          tier.tierId,
        );

      if (!tierId) {
        continue;
      }

      const tierComponents =
        requiredComponents.filter(
          (component) =>
            component.tierId
              .toString() ===
            tierId,
        );

      for (
        const location of
        activeServiceLocations
      ) {
        const locationId =
          this.safeObjectIdString(
            location.locationId,
          );

        if (!locationId) {
          continue;
        }

        for (
          const component of
          tierComponents
        ) {
          const componentId =
            component.componentId
              .toString();

          const key =
            `${tierId}_${locationId}_${componentId}`;

          if (
            !priceSet.has(key)
          ) {
            missingPricing.push({
              tier: {
                id: tierId,
                name:
                  tierMap.get(
                    tierId,
                  ) ??
                  "UNKNOWN",
              },
              location: {
                id:
                  locationId,
                name:
                  locationMap.get(
                    locationId,
                  )?.name ??
                  "UNKNOWN",
              },
              component: {
                id:
                  componentId,
                name:
                  componentMap.get(
                    componentId,
                  ) ??
                  "UNKNOWN",
              },
            });
          }
        }
      }
    }

    if (
      missingPricing.length > 0
    ) {
      issues.push({
        code:
          "MISSING_PRICING",
        message:
          "Pricing is missing for some tier/location/component combinations",
        severity: "blocking",
        meta: {
          count:
            missingPricing.length,
          samples:
            missingPricing.slice(
              0,
              10,
            ),
        },
      });
    }

    const blockingIssues =
      issues.filter(
        (issue) =>
          issue.severity ===
          "blocking",
      );

    const warnings =
      issues.filter(
        (issue) =>
          issue.severity ===
          "warning",
      );

    const info =
      issues.filter(
        (issue) =>
          issue.severity ===
          "info",
      );

    const isComplete =
      blockingIssues.length === 0;

    return {
      serviceId,
      serviceName:
        service.name,
      isActive:
        service.isActive,
      isComplete,
      summary: {
        totalIssues:
          issues.length,
        blocking:
          blockingIssues.length,
        warnings:
          warnings.length,
        info:
          info.length,
      },
      issues,
    };
  }
}
