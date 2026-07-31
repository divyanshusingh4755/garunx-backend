import mongoose, { Types } from "mongoose";
import { Package } from "../models/package.model.js";
import { Service } from "../models/service.model.js";
import {
  PackageTierMap,
  type IPackageTierService,
} from "../models/packagetiermap.model.js";
import { PackageCascadingEngine } from "./package-cascading-engine.service.js";

type MappingPayload = {
  packageId: string;
  tierId: string;
  services: Array<{
    serviceId: string;
    isRequired?: boolean;
    isRelated?: boolean;
  }>;
};

export class PackageTierMapService {
  private static async validateAndFormatServices(
    services: MappingPayload["services"],
    session?: mongoose.ClientSession,
  ): Promise<IPackageTierService[]> {
    if (!Array.isArray(services)) {
      throw new Error("Services field must be an array");
    }

    if (services.length === 0) {
      return [];
    }

    const normalizedServiceIds = services.map((service) =>
      service.serviceId?.toString(),
    );

    const uniqueServiceIds = [...new Set(normalizedServiceIds)];

    if (uniqueServiceIds.length !== normalizedServiceIds.length) {
      throw new Error("Duplicate serviceId is not allowed");
    }

    const objectIds = uniqueServiceIds.map((serviceId) => {
      if (!Types.ObjectId.isValid(serviceId)) {
        throw new Error(`Invalid serviceId: ${serviceId}`);
      }

      return new Types.ObjectId(serviceId);
    });

    let serviceQuery = Service.find({
      _id: { $in: objectIds },
      isActive: true,
    }).select("_id name");

    if (session) {
      serviceQuery = serviceQuery.session(session);
    }

    const dbServices = await serviceQuery;

    if (dbServices.length !== objectIds.length) {
      throw new Error("One or more services are invalid or inactive");
    }

    const serviceMap = new Map(
      dbServices.map((service) => [service._id.toString(), service]),
    );

    return services.map((service) => {
      const serviceId = service.serviceId.toString();
      const dbService = serviceMap.get(serviceId);

      if (!dbService) {
        throw new Error(`Service not found: ${serviceId}`);
      }

      const isRequired = service.isRequired === true;
      const isRelated = service.isRelated === true;

      if (isRequired && isRelated) {
        throw new Error(
          `${dbService.name} cannot be both required and related`,
        );
      }

      return {
        serviceId: new Types.ObjectId(serviceId),
        name: dbService.name,
        isRequired,
        isRelated,
      };
    });
  }

  private static async validatePackageTier(
    packageId: string,
    tierId: string,
    session?: mongoose.ClientSession,
  ) {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    if (!Types.ObjectId.isValid(tierId)) {
      throw new Error("Invalid tierId");
    }

    let packageQuery = Package.findById(packageId);

    if (session) {
      packageQuery = packageQuery.session(session);
    }

    const pkg = await packageQuery;

    if (!pkg) {
      throw new Error("Package not found");
    }

    const tierExists = pkg.tiers
      .filter((tier) => tier?.tierId)
      .some((tier) => tier.tierId.toString() === tierId);

    if (!tierExists) {
      throw new Error("Tier does not belong to package");
    }
  }

  static async bulkUpsertMappings(payload: MappingPayload) {
    const { packageId, tierId, services } = payload;

    await this.validatePackageTier(packageId, tierId);

    const formattedServices = await this.validateAndFormatServices(services);

    const mapping = await PackageTierMap.findOneAndUpdate(
      { packageId, tierId },
      {
        $set: {
          packageId,
          tierId,
          services: formattedServices,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    // Remove duplicate legacy mappings, while keeping the current document.
    await PackageTierMap.deleteMany({
      packageId,
      tierId,
      _id: { $ne: mapping._id },
    });

    await PackageCascadingEngine.run(packageId);

    return {
      success: true,
      message:
        formattedServices.length === 0
          ? "Package tier services cleared successfully"
          : "Package tier services updated successfully",
      data: mapping,
    };
  }

  static async replaceMappings(payload: MappingPayload) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { packageId, tierId, services } = payload;

      await this.validatePackageTier(packageId, tierId, session);

      const formattedServices = await this.validateAndFormatServices(
        services,
        session,
      );

      const mapping = await PackageTierMap.findOneAndUpdate(
        { packageId, tierId },
        {
          $set: {
            packageId,
            tierId,
            services: formattedServices,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          session,
        },
      );

      await PackageTierMap.deleteMany({
        packageId,
        tierId,
        _id: { $ne: mapping._id },
      }).session(session);

      await session.commitTransaction();

      await PackageCascadingEngine.run(packageId);

      return {
        success: true,
        message:
          formattedServices.length === 0
            ? "Package tier services cleared successfully"
            : "Package tier services replaced successfully",
        data: mapping,
      };
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  static async getServicesByPackageAndTier(packageId: string, tierId: string) {
    await this.validatePackageTier(packageId, tierId);

    const mapping = await PackageTierMap.findOne({
      packageId,
      tierId,
    }).lean();

    if (!mapping) {
      return [];
    }

    return (mapping.services || []).map((service) => ({
      serviceId: service.serviceId,
      name: service.name,
      isRequired: service.isRequired,
      isRelated: service.isRelated ?? false,
    }));
  }

  static async patchService(payload: {
    packageId: string;
    tierId: string;
    serviceId: string;
    isRequired?: boolean;
    isRelated?: boolean;
  }) {
    const { packageId, tierId, serviceId, isRequired, isRelated } = payload;

    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    if (!Types.ObjectId.isValid(tierId)) {
      throw new Error("Invalid tierId");
    }

    if (!Types.ObjectId.isValid(serviceId)) {
      throw new Error("Invalid serviceId");
    }

    if (
      typeof isRequired !== "boolean" &&
      typeof isRelated !== "boolean"
    ) {
      throw new Error("isRequired or isRelated is required");
    }

    const mapping = await PackageTierMap.findOne({
      packageId,
      tierId,
    });

    if (!mapping) {
      throw new Error("Service mapping not found");
    }

    const currentService = mapping.services.find(
      (service) => service.serviceId.toString() === serviceId,
    );

    if (!currentService) {
      throw new Error("Service not found in mapping");
    }

    const finalIsRequired =
      typeof isRequired === "boolean" ? isRequired : currentService.isRequired;

    const finalIsRelated =
      typeof isRelated === "boolean" ? isRelated : currentService.isRelated;

    if (finalIsRequired && finalIsRelated) {
      throw new Error("A service cannot be both required and related");
    }

    currentService.isRequired = finalIsRequired;
    currentService.isRelated = finalIsRelated;

    await mapping.save();

    await PackageCascadingEngine.run(packageId);

    return {
      success: true,
      message: "Service mapping updated successfully",
      data: currentService,
    };
  }
}
