import mongoose, { Types, } from "mongoose";
import { Package, } from "../models/package.model.js";
import { Service, } from "../models/service.model.js";
import { PackageTierMap, } from "../models/packagetiermap.model.js";
import { PackageCascadingEngine, } from "./package-cascading-engine.service.js";
import { RedisCacheService, } from "./redis-cache.service.js";
import { CacheKeys, } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS, } from "../cache/constants.js";
export class PackageTierMapService {
    static async invalidatePackageTierMapCache(packageId) {
        await Promise.all([
            /*
             * Direct PackageTierMap response.
             */
            RedisCacheService.deleteByPattern(CacheKeys
                .packageTierServicesByPackagePattern(packageId)),
            /*
             * Full package contains mappings.
             */
            RedisCacheService.delete(CacheKeys.packageFull(packageId)),
            /*
             * City-specific package response.
             */
            RedisCacheService.deleteByPattern(CacheKeys
                .packageFullByCitiesPattern(packageId)),
            /*
             * Related-services response depends
             * directly on mapping.isRelated.
             */
            RedisCacheService.deleteByPattern(CacheKeys
                .packageRelatedServicesPattern(packageId)),
            /*
             * Cascading may update:
             *
             * isComplete
             * isActive
             * startingPrice
             */
            RedisCacheService.delete(CacheKeys.packageDetail(packageId)),
            RedisCacheService.deleteByPattern(CacheKeys.packageListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys
                .packageByLocationListPattern()),
        ]);
    }
    static async validateAndFormatServices(services, tierId, session) {
        if (!Array.isArray(services)) {
            throw new Error("Services field must be an array");
        }
        if (services.length ===
            0) {
            return [];
        }
        const normalizedServiceIds = services.map((service) => service.serviceId
            ?.toString());
        const uniqueServiceIds = [
            ...new Set(normalizedServiceIds),
        ];
        if (uniqueServiceIds.length !==
            normalizedServiceIds.length) {
            throw new Error("Duplicate serviceId is not allowed");
        }
        const objectIds = uniqueServiceIds.map((serviceId) => {
            if (!Types.ObjectId.isValid(serviceId)) {
                throw new Error(`Invalid serviceId: ${serviceId}`);
            }
            return new Types.ObjectId(serviceId);
        });
        let serviceQuery = Service.find({
            _id: {
                $in: objectIds,
            },
            isActive: true,
            isComplete: true,
            "tiers.tierId": new Types.ObjectId(tierId),
        }).select("_id name");
        if (session) {
            serviceQuery =
                serviceQuery.session(session);
        }
        const dbServices = await serviceQuery;
        if (dbServices.length !==
            objectIds.length) {
            throw new Error("One or more services are invalid, inactive, incomplete, or do not support this tier");
        }
        const serviceMap = new Map(dbServices.map((service) => [
            service._id.toString(),
            service,
        ]));
        return services.map((service) => {
            const serviceId = service.serviceId.toString();
            const dbService = serviceMap.get(serviceId);
            if (!dbService) {
                throw new Error(`Service not found: ${serviceId}`);
            }
            const isRequired = service.isRequired ===
                true;
            const isRelated = service.isRelated ===
                true;
            if (isRequired &&
                isRelated) {
                throw new Error(`${dbService.name} cannot be both required and related`);
            }
            return {
                serviceId: new Types.ObjectId(serviceId),
                name: dbService.name,
                isRequired,
                isRelated,
            };
        });
    }
    static async validatePackageTier(packageId, tierId, session) {
        if (!Types.ObjectId.isValid(packageId)) {
            throw new Error("Invalid packageId");
        }
        if (!Types.ObjectId.isValid(tierId)) {
            throw new Error("Invalid tierId");
        }
        let packageQuery = Package.findById(packageId);
        if (session) {
            packageQuery =
                packageQuery.session(session);
        }
        const pkg = await packageQuery;
        if (!pkg) {
            throw new Error("Package not found");
        }
        const tierExists = pkg.tiers
            .filter((tier) => tier?.tierId)
            .some((tier) => tier.tierId.toString() ===
            tierId);
        if (!tierExists) {
            throw new Error("Tier does not belong to package");
        }
    }
    /*
     * BULK UPSERT
     *
     * Submitted services:
     * - inserted when missing
     * - updated when existing
     *
     * Existing services not included in the
     * request remain untouched.
     *
     * Use replaceMappings() when the caller
     * wants complete replacement.
     */
    static async bulkUpsertMappings(payload) {
        const { packageId, tierId, services, } = payload;
        const session = await mongoose.startSession();
        let result;
        try {
            await session.withTransaction(async () => {
                await this.validatePackageTier(packageId, tierId, session);
                const formattedServices = await this.validateAndFormatServices(services, tierId, session);
                const existing = await PackageTierMap.findOne({
                    packageId: new Types.ObjectId(packageId),
                    tierId: new Types.ObjectId(tierId),
                }).session(session);
                /*
                 * Mapping doesn't exist yet.
                 */
                if (!existing) {
                    const created = await PackageTierMap.create([
                        {
                            packageId: new Types.ObjectId(packageId),
                            tierId: new Types.ObjectId(tierId),
                            services: formattedServices,
                        },
                    ], {
                        session,
                    });
                    const mapping = created[0];
                    if (!mapping) {
                        throw new Error("Unable to create package tier mapping");
                    }
                    result = {
                        packageId: mapping.packageId,
                        tierId: mapping.tierId,
                        services: mapping.services.map((service) => ({
                            serviceId: service.serviceId,
                            name: service.name,
                            isRequired: service.isRequired,
                            isRelated: service.isRelated,
                        })),
                    };
                }
                else {
                    /*
                     * Merge existing services with
                     * submitted services.
                     */
                    const mergedServices = new Map();
                    for (const service of existing.services) {
                        mergedServices.set(service.serviceId.toString(), {
                            serviceId: service.serviceId,
                            name: service.name,
                            isRequired: service.isRequired,
                            isRelated: service.isRelated ??
                                false,
                        });
                    }
                    for (const service of formattedServices) {
                        mergedServices.set(service.serviceId.toString(), service);
                    }
                    existing.services =
                        [
                            ...mergedServices.values(),
                        ];
                    const saved = await existing.save({
                        session,
                    });
                    result = {
                        packageId: saved.packageId,
                        tierId: saved.tierId,
                        services: saved.services.map((service) => ({
                            serviceId: service.serviceId,
                            name: service.name,
                            isRequired: service.isRequired,
                            isRelated: service.isRelated,
                        })),
                    };
                }
                /*
                 * IMPORTANT:
                 *
                 * Cascade in the SAME transaction.
                 */
                await PackageCascadingEngine.run(packageId, session);
            });
        }
        finally {
            await session.endSession();
        }
        /*
         * Redis is invalidated only after
         * successful MongoDB commit.
         */
        await this.invalidatePackageTierMapCache(packageId);
        return {
            success: true,
            message: services.length ===
                0
                ? "No package tier services required updating"
                : "Package tier services updated successfully",
            data: result,
        };
    }
    /*
     * COMPLETE REPLACEMENT.
     *
     * Whatever is supplied becomes the entire
     * service set for package+tier.
     */
    static async replaceMappings(payload) {
        const { packageId, tierId, services, } = payload;
        const session = await mongoose.startSession();
        let result;
        try {
            await session.withTransaction(async () => {
                await this.validatePackageTier(packageId, tierId, session);
                const formattedServices = await this.validateAndFormatServices(services, tierId, session);
                const mapping = await PackageTierMap.findOneAndUpdate({
                    packageId: new Types.ObjectId(packageId),
                    tierId: new Types.ObjectId(tierId),
                }, {
                    $set: {
                        services: formattedServices,
                    },
                    $setOnInsert: {
                        packageId: new Types.ObjectId(packageId),
                        tierId: new Types.ObjectId(tierId),
                    },
                }, {
                    upsert: true,
                    new: true,
                    runValidators: true,
                    setDefaultsOnInsert: true,
                    session,
                });
                if (!mapping) {
                    throw new Error("Unable to replace package tier mapping");
                }
                result = {
                    packageId: mapping.packageId,
                    tierId: mapping.tierId,
                    services: mapping.services.map((service) => ({
                        serviceId: service.serviceId,
                        name: service.name,
                        isRequired: service.isRequired,
                        isRelated: service.isRelated,
                    })),
                };
                /*
                 * Mapping replacement can make
                 * existing package pricing orphaned.
                 *
                 * Cascade removes those rows and
                 * recalculates package state.
                 */
                await PackageCascadingEngine.run(packageId, session);
            });
        }
        finally {
            await session.endSession();
        }
        await this.invalidatePackageTierMapCache(packageId);
        return {
            success: true,
            message: services.length ===
                0
                ? "Package tier services cleared successfully"
                : "Package tier services replaced successfully",
            data: result,
        };
    }
    static async getServicesByPackageAndTier(packageId, tierId) {
        /*
         * Keep structural validation live.
         */
        await this.validatePackageTier(packageId, tierId);
        return RedisCacheService.getOrSet({
            key: CacheKeys.packageTierServices(packageId, tierId),
            ttlSeconds: CACHE_TTL_SECONDS
                .PACKAGE_TIER_SERVICES,
            loader: async () => {
                const mapping = await PackageTierMap.findOne({
                    packageId,
                    tierId,
                }).lean();
                if (!mapping) {
                    return [];
                }
                return (mapping.services ??
                    []).map((service) => ({
                    serviceId: service.serviceId,
                    name: service.name,
                    isRequired: service.isRequired,
                    isRelated: service.isRelated ??
                        false,
                }));
            },
        });
    }
    static async patchService(payload) {
        const { packageId, tierId, serviceId, isRequired, isRelated, } = payload;
        if (!Types.ObjectId.isValid(packageId)) {
            throw new Error("Invalid packageId");
        }
        if (!Types.ObjectId.isValid(tierId)) {
            throw new Error("Invalid tierId");
        }
        if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error("Invalid serviceId");
        }
        if (typeof isRequired !==
            "boolean" &&
            typeof isRelated !==
                "boolean") {
            throw new Error("isRequired or isRelated is required");
        }
        const session = await mongoose.startSession();
        let result;
        try {
            await session.withTransaction(async () => {
                await this.validatePackageTier(packageId, tierId, session);
                /*
                 * The mapped service must still be
                 * globally available.
                 */
                const service = await Service.findOne({
                    _id: new Types.ObjectId(serviceId),
                    isActive: true,
                    isComplete: true,
                })
                    .session(session)
                    .select("_id name");
                if (!service) {
                    throw new Error("Service is invalid, inactive, or incomplete");
                }
                const mapping = await PackageTierMap.findOne({
                    packageId: new Types.ObjectId(packageId),
                    tierId: new Types.ObjectId(tierId),
                }).session(session);
                if (!mapping) {
                    throw new Error("Service mapping not found");
                }
                const currentService = mapping.services.find((item) => item.serviceId.toString() ===
                    serviceId);
                if (!currentService) {
                    throw new Error("Service not found in mapping");
                }
                const finalIsRequired = typeof isRequired ===
                    "boolean"
                    ? isRequired
                    : currentService
                        .isRequired;
                const finalIsRelated = typeof isRelated ===
                    "boolean"
                    ? isRelated
                    : currentService
                        .isRelated;
                if (finalIsRequired &&
                    finalIsRelated) {
                    throw new Error("A service cannot be both required and related");
                }
                currentService.isRequired =
                    finalIsRequired;
                currentService.isRelated =
                    finalIsRelated;
                /*
                 * Refresh canonical service name too.
                 */
                currentService.name =
                    service.name;
                await mapping.save({
                    session,
                });
                result = {
                    serviceId: currentService.serviceId,
                    name: currentService.name,
                    isRequired: currentService.isRequired,
                    isRelated: currentService.isRelated,
                };
                /*
                 * Same transaction as mapping change.
                 */
                await PackageCascadingEngine.run(packageId, session);
            });
        }
        finally {
            await session.endSession();
        }
        await this.invalidatePackageTierMapCache(packageId);
        return {
            success: true,
            message: "Service mapping updated successfully",
            data: result,
        };
    }
}
//# sourceMappingURL=packagetiermap.service.js.map