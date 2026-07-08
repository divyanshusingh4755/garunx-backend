import mongoose, { Types } from "mongoose";
import { Location } from "../models/location.model.js";
import { Service } from "../models/service.model.js";
import { Package } from "../models/package.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
export class LocationService {
    static async createLocation(data) {
        const newLocation = new Location(data);
        return await newLocation.save();
    }
    static applyFilter(filterValue) {
        if (!filterValue)
            return undefined;
        const values = filterValue.split(",").map((val) => val.trim());
        return { $in: values };
    }
    static async FindLocation(params) {
        const { searchTerm, countryFilter, stateIdFilter, cityIdFilter, pincodeFilter, limit = 40, page = 1, isActive, sortBy = "createdAt", sortOrder = "desc", } = params;
        const skip = limit * (page - 1);
        const query = {};
        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }
        if (countryFilter)
            query.country = this.applyFilter(countryFilter);
        if (stateIdFilter)
            query.stateId = this.applyFilter(stateIdFilter);
        if (cityIdFilter)
            query.cityId = this.applyFilter(cityIdFilter);
        if (pincodeFilter)
            query.pincode = this.applyFilter(pincodeFilter);
        const isTextSearch = !!searchTerm?.trim() && searchTerm.trim().length >= 3;
        if (searchTerm?.trim()) {
            const term = searchTerm.trim();
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
        let sortCriteria = {};
        if (isTextSearch && sortBy === "relevance") {
            sortCriteria = {
                score: {
                    $meta: "textScore",
                },
            };
        }
        else {
            sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
            if (sortBy !== "createdAt") {
                sortCriteria.createdAt = -1;
            }
        }
        try {
            const [data, total] = await Promise.all([
                Location.find(query)
                    .populate("stateId", "name")
                    .populate("cityId", "name")
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Location.countDocuments(query),
            ]);
            const formattedData = data.map((loc) => ({
                id: loc._id,
                name: loc.name,
                country: loc.country,
                state: {
                    id: loc.stateId?._id,
                    name: loc.stateId?.name,
                },
                city: {
                    id: loc.cityId?._id,
                    name: loc.cityId?.name,
                },
                pincode: loc.pincode,
                fullAddress: loc.fullAddress,
                isActive: loc.isActive,
                image: loc.image,
                description: loc.description,
                location: loc.location,
            }));
            return {
                data: formattedData,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            throw new Error(`Location fetched failed: ${error.message}`);
        }
    }
    static async updateLocation(locationId, updateData) {
        try {
            const updatedLocation = await Location.findByIdAndUpdate(locationId, { $set: updateData }, { new: true, runValidators: true }).lean();
            if (!updatedLocation) {
                throw new Error("Location not found");
            }
            return updatedLocation;
        }
        catch (error) {
            throw new Error(`Location Update Failed: ${error.message}`);
        }
    }
    static async getDeactivationImpact(locationId) {
        const [services, packages] = await Promise.all([
            Service.find({
                "locations.locationId": locationId,
                "locations.isActive": true,
            }, {
                _id: 1,
                name: 1,
            }).lean(),
            Package.find({
                "locations.locationId": locationId,
                "locations.isActive": true,
            }, {
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
        // Verify location exists
        const location = await Location.findById(locationId).lean();
        if (!location) {
            throw new Error("Location not found");
        }
        // Confirmation only when deactivating
        if (!status && !confirmed) {
            const impact = await this.getDeactivationImpact(locationId);
            return {
                requiresConfirmation: true,
                impact,
            };
        }
        const session = await Location.db.startSession();
        try {
            await session.withTransaction(async () => {
                // Always update the parent location
                await Location.findByIdAndUpdate(locationId, { isActive: status }, { session });
                // Only cascade when deactivating
                if (!status) {
                    const targetId = mongoose.Types.ObjectId.isValid(locationId)
                        ? new mongoose.Types.ObjectId(locationId)
                        : locationId;
                    const updatePayload = {
                        $set: {
                            "locations.$[loc].isActive": false,
                        },
                    };
                    const options = {
                        session,
                        arrayFilters: [{ "loc.locationId": targetId }],
                    };
                    await Service.updateMany({ "locations.locationId": targetId }, updatePayload, options);
                    await Package.updateMany({ "locations.locationId": targetId }, updatePayload, options);
                }
            });
            return { success: true };
        }
        catch (error) {
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    static async getLocationById(locationId) {
        try {
            const location = await Location.findById(locationId).lean().exec();
            if (!location) {
                const error = new Error("Location not found");
                error.statusCode = 404;
                throw error;
            }
            return location;
        }
        catch (error) {
            throw new Error(`Failed to get location: ${error.message}`);
        }
    }
    static async getLocationByIds(locationIds) {
        try {
            const validIds = locationIds.filter((id) => Types.ObjectId.isValid(id));
            if (validIds.length === 0) {
                throw new Error("No valid location IDs provided");
            }
            const locations = await Location.find({
                _id: { $in: validIds },
            })
                .populate("stateId", "name")
                .populate("cityId", "name")
                .lean()
                .exec();
            if (!locations || locations.length === 0) {
                const error = new Error("Locations not found");
                error.statusCode = 404;
                throw error;
            }
            const formattedData = locations.map((loc) => ({
                id: loc._id,
                name: loc.name,
                country: loc.country,
                state: {
                    id: loc.stateId?._id,
                    name: loc.stateId?.name,
                },
                city: {
                    id: loc.cityId?._id,
                    name: loc.cityId?.name,
                },
                pincode: loc.pincode,
                fullAddress: loc.fullAddress,
                isActive: loc.isActive,
                image: loc.image,
                description: loc.description,
                location: loc.location,
            }));
            return formattedData;
        }
        catch (error) {
            throw new Error(`Failed to get locations: ${error.message}`);
        }
    }
}
//# sourceMappingURL=location.service.js.map