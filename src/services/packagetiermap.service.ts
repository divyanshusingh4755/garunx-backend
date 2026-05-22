import { Types } from "mongoose";
import mongoose from "mongoose";
import { Package } from "../models/package.model.js";
import { Service } from "../models/service.model.js";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { PackageCascadingEngine } from "./package-cascading-engine.service.js";

export class PackageTierMapService {
  static async bulkUpsertMappings(payload: any) {
    const { packageId, tierId, services } = payload;

    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    if (!Types.ObjectId.isValid(tierId)) {
      throw new Error("Invalid tierId");
    }

    if (!Array.isArray(services) || services.length === 0) {
      throw new Error("Services array is required");
    }

    const pkg = await Package.findById(packageId);
    if (!pkg) throw new Error("Package not found");

    const tierExists = pkg.tiers
      .filter((t) => t?.tierId)
      .some((t) => t.tierId.toString() === tierId);

    if (!tierExists) {
      throw new Error("Tier does not belong to package");
    }

    const serviceIds = [...new Set(services.map((s: any) => s.serviceId))];

    const objectIds = serviceIds.map((id) => {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid serviceId: ${id}`);
      }
      return new Types.ObjectId(id);
    });

    const dbServices = await Service.find({
      _id: { $in: objectIds },
      isActive: true,
    }).select("_id name");

    if (dbServices.length !== objectIds.length) {
      throw new Error("One or more services are invalid or inactive");
    }

    const serviceMap = new Map(dbServices.map((s) => [s._id.toString(), s]));

    const formattedServices = services.map((s: any) => {
      const key = s.serviceId?.toString?.();

      if (!key) {
        throw new Error("Invalid serviceId in payload");
      }

      const service = serviceMap.get(key);

      if (!service) {
        throw new Error(`Service not found: ${key}`);
      }

      return {
        serviceId: new Types.ObjectId(key),
        name: service.name,
        isRequired: !!s.isRequired,
      };
    });

    await PackageTierMap.updateOne(
      { packageId, tierId },
      {
        $set: {
          packageId,
          tierId,
          services: formattedServices,
        },
      },
      { upsert: true },
    );

    await PackageTierMap.deleteMany({
      packageId,
      tierId,
    });

    await PackageTierMap.create({
      packageId,
      tierId,
      services: formattedServices,
    });

    await PackageCascadingEngine.run(packageId);

    return {
      success: true,
      message: "Package tier services updated successfully",
    };
  }

  static async replaceMappings(payload: any) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { packageId, tierId, services } = payload;

      if (!Types.ObjectId.isValid(packageId)) {
        throw new Error("Invalid packageId");
      }

      if (!Types.ObjectId.isValid(tierId)) {
        throw new Error("Invalid tierId");
      }

      if (!Array.isArray(services) || services.length === 0) {
        throw new Error("At least one service is required");
      }

      const pkg = await Package.findById(packageId).session(session);
      if (!pkg) throw new Error("Package not found");

      const tierExists = pkg.tiers
        .filter((t) => t?.tierId)
        .some((t) => t.tierId.toString() === tierId);

      if (!tierExists) {
        throw new Error("Tier does not belong to package");
      }

      const serviceIds = [...new Set(services.map((s: any) => s.serviceId))];

      const objectIds = serviceIds.map((id: string) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new Error(`Invalid serviceId: ${id}`);
        }
        return new Types.ObjectId(id);
      });

      const dbServices = await Service.find({
        _id: { $in: objectIds },
        isActive: true,
      })
        .select("_id name")
        .session(session);

      if (dbServices.length !== objectIds.length) {
        throw new Error("Invalid or inactive services");
      }

      const serviceMap = new Map(dbServices.map((s) => [s._id.toString(), s]));

      const docs = services.map((s: any) => {
        const dbService = serviceMap.get(s.serviceId)!;

        return {
          packageId,
          tierId,
          serviceId: s.serviceId,
          name: dbService.name,
          isRequired: !!s.isRequired,
        };
      });

      await PackageTierMap.deleteMany({
        packageId,
        tierId,
      }).session(session);

      await PackageTierMap.insertMany(docs, { session });

      await session.commitTransaction();
      session.endSession();

      await PackageCascadingEngine.run(packageId);

      return {
        success: true,
        message: "Package tier services replaced successfully",
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  static async getServicesByPackageAndTier(packageId: string, tierId: string) {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    if (!Types.ObjectId.isValid(tierId)) {
      throw new Error("Invalid tierId");
    }

    const pkg = await Package.findById(packageId);
    if (!pkg) throw new Error("Package not found");

    const tierExists = pkg.tiers.some((t) => t.tierId.toString() === tierId);

    if (!tierExists) {
      throw new Error("Tier does not belong to package");
    }

    const mappings = await PackageTierMap.find({
      packageId,
      tierId,
    }).lean();

    return mappings.flatMap((m) =>
      (m.services || []).map((s: any) => ({
        serviceId: s.serviceId,
        name: s.name,
        isRequired: s.isRequired,
      })),
    );
  }

  static async patchService(payload: any) {
    const { packageId, tierId, serviceId, isRequired } = payload;

    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    if (!Types.ObjectId.isValid(tierId)) {
      throw new Error("Invalid tierId");
    }

    if (!Types.ObjectId.isValid(serviceId)) {
      throw new Error("Invalid serviceId");
    }

    const mapping = await PackageTierMap.findOne({
      packageId,
      tierId,
    });

    if (!mapping) {
      throw new Error("Service mapping not found");
    }

    const serviceExists = mapping.services?.some(
      (s: any) => s.serviceId.toString() === serviceId,
    );

    if (!serviceExists) {
      throw new Error("Service not found in mapping");
    }

    const updateData: any = {};

    if (typeof isRequired === "boolean") {
      updateData["services.$.isRequired"] = isRequired;
    }

    await PackageTierMap.updateOne(
      {
        packageId,
        tierId,
        "services.serviceId": serviceId,
      },
      {
        $set: updateData,
      },
    );

    await PackageCascadingEngine.run(packageId);

    return {
      success: true,
      message: "Service mapping updated successfully",
    };
  }
}
