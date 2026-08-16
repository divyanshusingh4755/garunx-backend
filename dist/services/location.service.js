import mongoose, { Types } from "mongoose";
import { Location, } from "../models/location.model.js";
import { Service } from "../models/service.model.js";
import { Package } from "../models/package.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";
import { State } from "../models/state.model.js";
import { City } from "../models/city.model.js";
const createHttpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
export class LocationService {
    static async invalidateLocationCache(locationId) {
        const operations = [
            RedisCacheService.deleteByPattern(CacheKeys.locationListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.locationIdsPattern()),
        ];
        if (locationId) {
            operations.push(RedisCacheService.delete(CacheKeys.locationDetail(locationId)));
        }
        await Promise.all(operations);
    }
    static async validateHierarchy(params) {
        const { country, stateId, cityId } = params;
        const [state, city] = await Promise.all([
            State.exists({
                _id: stateId,
                country,
            }),
            City.exists({
                _id: cityId,
                stateId,
                country,
            }),
        ]);
        if (!state) {
            throw createHttpError("State does not belong to country", 400);
        }
        if (!city) {
            throw createHttpError("City does not belong to state/country", 400);
        }
    }
    static async createLocation(data) {
        await this.validateHierarchy({
            country: data.country,
            stateId: data.stateId,
            cityId: data.cityId,
        });
        const location = await Location.create(data);
        await this.invalidateLocationCache();
        return location;
    }
    static applyStringFilter(filterValue) {
        if (!filterValue?.trim())
            return undefined;
        const values = filterValue
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
        return values.length > 0 ? { $in: values } : undefined;
    }
    static applyObjectIdFilter(filterValue) {
        if (!filterValue?.trim())
            return undefined;
        const values = filterValue
            .split(",")
            .map((value) => value.trim())
            .filter((value) => Types.ObjectId.isValid(value))
            .map((value) => new Types.ObjectId(value));
        return values.length > 0 ? { $in: values } : undefined;
    }
    static async findLocation(params) {
        const { searchTerm, countryFilter, stateIdFilter, cityIdFilter, pincodeFilter, limit = 40, page = 1, isActive, sortBy = "createdAt", sortOrder = "desc", } = params;
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        const allowedSortFields = new Set([
            "name",
            "country",
            "pincode",
            "createdAt",
            "updatedAt",
        ]);
        const term = searchTerm?.trim();
        const isTextSearch = Boolean(term &&
            term.length >
                4);
        const safeSortBy = isTextSearch &&
            sortBy ===
                "relevance"
            ? "relevance"
            : allowedSortFields.has(sortBy)
                ? sortBy
                : "createdAt";
        const cacheKey = CacheKeys.locationList({
            searchTerm,
            countryFilter,
            stateIdFilter,
            cityIdFilter,
            pincodeFilter,
            limit: safeLimit,
            page: safePage,
            isActive,
            sortBy: safeSortBy,
            sortOrder,
        });
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS
                .LOCATION_LIST,
            loader: async () => {
                const skip = safeLimit *
                    (safePage - 1);
                const query = {};
                if (typeof isActive ===
                    "boolean") {
                    query.isActive =
                        isActive;
                }
                const countryQuery = this.applyStringFilter(countryFilter);
                const stateQuery = this.applyObjectIdFilter(stateIdFilter);
                const cityQuery = this.applyObjectIdFilter(cityIdFilter);
                const pincodeQuery = this.applyStringFilter(pincodeFilter);
                if (countryQuery) {
                    query.country =
                        countryQuery;
                }
                if (stateQuery) {
                    query.stateId =
                        stateQuery;
                }
                if (cityQuery) {
                    query.cityId =
                        cityQuery;
                }
                if (pincodeQuery) {
                    query.pincode =
                        pincodeQuery;
                }
                if (term) {
                    if (isTextSearch) {
                        query.$text = {
                            $search: term,
                        };
                    }
                    else {
                        query.$or = [
                            {
                                name: {
                                    $regex: `^${escapeRegex(term)}`,
                                    $options: "i",
                                },
                            },
                            {
                                pincode: {
                                    $regex: `^${escapeRegex(term)}`,
                                },
                            },
                        ];
                    }
                }
                let sortCriteria;
                if (isTextSearch &&
                    safeSortBy ===
                        "relevance") {
                    sortCriteria = {
                        score: {
                            $meta: "textScore",
                        },
                    };
                }
                else {
                    sortCriteria = {
                        [safeSortBy]: sortOrder ===
                            "asc"
                            ? 1
                            : -1,
                    };
                    if (safeSortBy !==
                        "createdAt") {
                        sortCriteria.createdAt =
                            -1;
                    }
                }
                const [data, total,] = await Promise.all([
                    Location.find(query)
                        .populate("stateId", "name")
                        .populate("cityId", "name")
                        .sort(sortCriteria)
                        .skip(skip)
                        .limit(safeLimit)
                        .lean(),
                    Location.countDocuments(query),
                ]);
                const formattedData = data.map((location) => ({
                    id: location._id,
                    name: location.name,
                    country: location.country,
                    state: {
                        id: location
                            .stateId
                            ?._id,
                        name: location
                            .stateId
                            ?.name,
                    },
                    city: {
                        id: location
                            .cityId
                            ?._id,
                        name: location
                            .cityId
                            ?.name,
                    },
                    pincode: location.pincode,
                    fullAddress: location.fullAddress,
                    isActive: location.isActive,
                    image: location.image,
                    description: location.description,
                    location: location.location,
                }));
                return {
                    data: formattedData,
                    total,
                    page: safePage,
                    totalPages: Math.ceil(total /
                        safeLimit),
                };
            },
        });
    }
    static async updateLocation(locationId, updateData) {
        const existingLocation = await Location.findById(locationId)
            .select("country stateId cityId")
            .lean();
        if (!existingLocation) {
            throw createHttpError("Location not found", 404);
        }
        const country = updateData.country ??
            existingLocation.country;
        const stateId = updateData.stateId ??
            existingLocation.stateId.toString();
        const cityId = updateData.cityId ??
            existingLocation.cityId.toString();
        if (updateData.country !== undefined ||
            updateData.stateId !== undefined ||
            updateData.cityId !== undefined) {
            await this.validateHierarchy({
                country,
                stateId,
                cityId,
            });
        }
        const updatedLocation = await Location.findByIdAndUpdate(locationId, { $set: updateData }, {
            new: true,
            runValidators: true,
        }).lean();
        if (!updatedLocation) {
            throw createHttpError("Location not found", 404);
        }
        await this.invalidateLocationCache(locationId);
        return updatedLocation;
    }
    static async getDeactivationImpact(locationId) {
        const targetId = new Types.ObjectId(locationId);
        const linkedLocationQuery = {
            locations: {
                $elemMatch: {
                    locationId: targetId,
                    isActive: true,
                },
            },
        };
        const [services, packages] = await Promise.all([
            Service.find(linkedLocationQuery, {
                _id: 1,
                name: 1,
            }).lean(),
            Package.find(linkedLocationQuery, {
                _id: 1,
                name: 1,
            }).lean(),
        ]);
        return {
            servicesCount: services.length,
            packagesCount: packages.length,
            services,
            packages,
        };
    }
    static async softDeleteLocation(locationId, status, confirmed = false) {
        const location = await Location.findById(locationId)
            .select("_id isActive")
            .lean();
        if (!location) {
            throw createHttpError("Location not found", 404);
        }
        if (location.isActive === status) {
            return {
                success: true,
                unchanged: true,
            };
        }
        if (!status && !confirmed) {
            const impact = await this.getDeactivationImpact(locationId);
            if (impact.servicesCount > 0 || impact.packagesCount > 0) {
                return {
                    requiresConfirmation: true,
                    impact,
                };
            }
        }
        const session = await mongoose.startSession();
        try {
            session.startTransaction();
            const updatedLocation = await Location.findByIdAndUpdate(locationId, { $set: { isActive: status } }, {
                new: true,
                session,
            }).lean();
            if (!updatedLocation) {
                throw createHttpError("Location not found", 404);
            }
            if (!status) {
                const targetId = new Types.ObjectId(locationId);
                const updatePayload = {
                    $set: {
                        "locations.$[loc].isActive": false,
                    },
                };
                const options = {
                    session,
                    arrayFilters: [
                        {
                            "loc.locationId": targetId,
                            "loc.isActive": true,
                        },
                    ],
                };
                await Promise.all([
                    Service.updateMany({
                        locations: {
                            $elemMatch: {
                                locationId: targetId,
                                isActive: true,
                            },
                        },
                    }, updatePayload, options),
                    Package.updateMany({
                        locations: {
                            $elemMatch: {
                                locationId: targetId,
                                isActive: true,
                            },
                        },
                    }, updatePayload, options),
                ]);
            }
            await session.commitTransaction();
            await Promise.all([
                this.invalidateLocationCache(locationId),
                RedisCacheService.deleteByPattern(CacheKeys.serviceListPattern()),
                RedisCacheService.deleteByPattern(CacheKeys.serviceByLocationListPattern()),
                RedisCacheService.deleteByPattern(CacheKeys.serviceDetailPattern()),
                RedisCacheService.deleteByPattern(CacheKeys.serviceFullPattern()),
                RedisCacheService.deleteByPattern(CacheKeys.packageListPattern()),
            ]);
            return {
                success: true,
                location: updatedLocation,
            };
        }
        catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    static async getLocationById(locationId) {
        return RedisCacheService.getOrSet({
            key: CacheKeys.locationDetail(locationId),
            ttlSeconds: CACHE_TTL_SECONDS
                .LOCATION_DETAIL,
            loader: async () => {
                const location = await Location.findById(locationId)
                    .populate("stateId", "name")
                    .populate("cityId", "name")
                    .lean();
                if (!location) {
                    throw createHttpError("Location not found", 404);
                }
                return location;
            },
        });
    }
    static async getLocationByIds(locationIds) {
        const cacheKey = CacheKeys.locationIds(locationIds);
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS
                .LOCATION_IDS,
            loader: async () => {
                const invalidId = locationIds.find((id) => !Types.ObjectId.isValid(id));
                if (invalidId) {
                    throw createHttpError("Invalid location ID", 400);
                }
                const objectIds = locationIds.map((id) => new Types.ObjectId(id));
                const locations = await Location.find({
                    _id: {
                        $in: objectIds,
                    },
                    isActive: true,
                })
                    .populate("stateId", "name")
                    .populate("cityId", "name")
                    .lean();
                if (locations.length ===
                    0) {
                    throw createHttpError("Locations not found", 404);
                }
                return locations.map((location) => ({
                    id: location._id,
                    name: location.name,
                    country: location.country,
                    state: {
                        id: location
                            .stateId
                            ?._id,
                        name: location
                            .stateId
                            ?.name,
                    },
                    city: {
                        id: location
                            .cityId
                            ?._id,
                        name: location
                            .cityId
                            ?.name,
                    },
                    pincode: location.pincode,
                    fullAddress: location.fullAddress,
                    isActive: location.isActive,
                    image: location.image,
                    description: location.description,
                    location: location.location,
                }));
            },
        });
    }
    static async exportLocationsToCsv(locationIds) {
        const uniqueLocationIds = [
            ...new Set(locationIds),
        ];
        const locations = await Location.find({
            _id: {
                $in: uniqueLocationIds,
            },
        })
            .select([
            "name",
            "country",
            "stateId",
            "cityId",
            "fullAddress",
            "pincode",
            "image",
            "description",
            "isActive",
            "location",
            "createdAt",
            "updatedAt",
        ].join(" "))
            .populate({
            path: "stateId",
            select: "name gstCode",
        })
            .populate({
            path: "cityId",
            select: "name",
        })
            .lean();
        if (locations.length === 0) {
            throw new Error("No locations found for export");
        }
        /*
         * Protect CSV values both from malformed CSV
         * and spreadsheet formula injection.
         */
        const escapeCsv = (value) => {
            if (value === null ||
                value === undefined) {
                return "";
            }
            let stringValue = String(value);
            /*
             * Excel / spreadsheet applications may
             * interpret these prefixes as formulas.
             */
            if (/^[=+\-@]/.test(stringValue)) {
                stringValue =
                    `'${stringValue}`;
            }
            if (stringValue.includes(",") ||
                stringValue.includes('"') ||
                stringValue.includes("\n") ||
                stringValue.includes("\r")) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };
        const headers = [
            "Location ID",
            "Location Name",
            "Country",
            "State ID",
            "State Name",
            "GST Code",
            "City ID",
            "City Name",
            "Full Address",
            "Pincode",
            "Longitude",
            "Latitude",
            "Image",
            "Description",
            "Active",
            "Created At",
            "Updated At",
        ];
        const rows = locations.map((location) => {
            const state = location.stateId;
            const city = location.cityId;
            return [
                location._id.toString(),
                location.name,
                location.country,
                state?._id?.toString() ?? "",
                state?.name ?? "",
                state?.gstCode ?? "",
                city?._id?.toString() ?? "",
                city?.name ?? "",
                location.fullAddress,
                location.pincode,
                location.location
                    ?.coordinates?.[0] ?? "",
                location.location
                    ?.coordinates?.[1] ?? "",
                location.image ?? "",
                location.description ?? "",
                location.isActive
                    ? "Yes"
                    : "No",
                location.createdAt
                    ? new Date(location.createdAt).toISOString()
                    : "",
                location.updatedAt
                    ? new Date(location.updatedAt).toISOString()
                    : "",
            ];
        });
        const csv = [
            headers
                .map(escapeCsv)
                .join(","),
            ...rows.map((row) => row
                .map(escapeCsv)
                .join(",")),
        ].join("\n");
        /*
         * UTF-8 BOM helps Excel correctly
         * recognize UTF-8 location/address text.
         */
        const csvWithBom = `\uFEFF${csv}`;
        return {
            csv: csvWithBom,
            total: locations.length,
        };
    }
}
//# sourceMappingURL=location.service.js.map