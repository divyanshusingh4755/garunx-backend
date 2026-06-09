import { Types } from "mongoose";
import mongoose from "mongoose";
import { Package } from "../models/package.model.js";
import { Service } from "../models/service.model.js";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { PackageCascadingEngine } from "./package-cascading-engine.service.js";
export class PackageTierMapService {
    static async bulkUpsertMappings(payload) {
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
        if (!pkg)
            throw new Error("Package not found");
        const tierExists = pkg.tiers
            .filter((t) => t?.tierId)
            .some((t) => t.tierId.toString() === tierId);
        if (!tierExists) {
            throw new Error("Tier does not belong to package");
        }
        const serviceIds = [...new Set(services.map((s) => s.serviceId))];
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
        const formattedServices = services.map((s) => {
            const key = s.serviceId?.toString?.();
            if (!key) {
                throw new Error("Invalid serviceId in payload");
            }
            const service = serviceMap.get(key);
            if (!service) {
                throw new Error(`Service not found: ${key}`);
            }
            if (s.isRequired && s.isRelated) {
                throw new Error(`${service.name} cannot be both required and related`);
            }
            return {
                serviceId: new Types.ObjectId(key),
                name: service.name,
                isRequired: !!s.isRequired,
                isRelated: !!s.isRelated,
            };
        });
        await PackageTierMap.updateOne({ packageId, tierId }, {
            $set: {
                packageId,
                tierId,
                services: formattedServices,
            },
        }, { upsert: true });
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
    static async replaceMappings(payload) {
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
            if (!pkg)
                throw new Error("Package not found");
            const tierExists = pkg.tiers
                .filter((t) => t?.tierId)
                .some((t) => t.tierId.toString() === tierId);
            if (!tierExists) {
                throw new Error("Tier does not belong to package");
            }
            const serviceIds = [...new Set(services.map((s) => s.serviceId))];
            const objectIds = serviceIds.map((id) => {
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
            const docs = services.map((s) => {
                const dbService = serviceMap.get(s.serviceId);
                if (s.isRequired && s.isRelated) {
                    throw new Error(`${dbService.name} cannot be both required and related`);
                }
                return {
                    packageId,
                    tierId,
                    serviceId: s.serviceId,
                    name: dbService.name,
                    isRequired: !!s.isRequired,
                    isRelated: !!s.isRelated,
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
        }
        catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }
    static async getServicesByPackageAndTier(packageId, tierId) {
        if (!Types.ObjectId.isValid(packageId)) {
            throw new Error("Invalid packageId");
        }
        if (!Types.ObjectId.isValid(tierId)) {
            throw new Error("Invalid tierId");
        }
        const pkg = await Package.findById(packageId);
        if (!pkg)
            throw new Error("Package not found");
        const tierExists = pkg.tiers.some((t) => t.tierId.toString() === tierId);
        if (!tierExists) {
            throw new Error("Tier does not belong to package");
        }
        const mappings = await PackageTierMap.find({
            packageId,
            tierId,
        }).lean();
        return mappings.flatMap((m) => (m.services || []).map((s) => ({
            serviceId: s.serviceId,
            name: s.name,
            isRequired: s.isRequired,
            isRelated: s.isRelated ?? false,
        })));
    }
    static async patchService(payload) {
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
        const mapping = await PackageTierMap.findOne({
            packageId,
            tierId,
        });
        if (!mapping) {
            throw new Error("Service mapping not found");
        }
        const currentService = mapping.services.find((s) => s.serviceId.toString() === serviceId);
        if (!currentService) {
            throw new Error("Service not found in mapping");
        }
        const finalIsRequired = typeof isRequired === "boolean" ? isRequired : currentService.isRequired;
        const finalIsRelated = typeof isRelated === "boolean" ? isRelated : currentService.isRelated;
        if (finalIsRequired && finalIsRelated) {
            throw new Error("A service cannot be both required and related");
        }
        await PackageTierMap.updateOne({
            packageId,
            tierId,
            "services.serviceId": serviceId,
        }, {
            $set: {
                "services.$.isRequired": finalIsRequired,
                "services.$.isRelated": finalIsRelated,
            },
        });
        await PackageCascadingEngine.run(packageId);
        return {
            success: true,
            message: "Service mapping updated successfully",
        };
    }
}
//# sourceMappingURL=packagetiermap.service.js.map