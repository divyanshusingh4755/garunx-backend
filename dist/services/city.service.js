import { City } from "../models/city.model.js";
import { State } from "../models/state.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
export class CityService {
    static applyFilter(filterValue) {
        if (!filterValue)
            return undefined;
        const values = filterValue.split(",").map((val) => val.trim());
        return { $in: values };
    }
    static async createCity(params) {
        const { name, country, stateId, image, description, location } = params;
        const validState = await State.findOne({
            _id: stateId,
            country: country,
        });
        if (!validState) {
            throw new Error("State does not belong to country");
        }
        const newCity = new City({
            name,
            country,
            stateId,
            image,
            description,
            location,
        });
        return await newCity.save();
    }
    static async FindCity(params) {
        const { searchTerm, cityFilter, stateIdFilter, countryFilter, limit = 40, page = 1, isActive, sortBy = "createdAt", sortOrder = "desc", } = params;
        const skip = (page - 1) * limit;
        const query = {};
        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }
        if (cityFilter)
            query.name = this.applyFilter(cityFilter);
        if (stateIdFilter)
            query.stateId = this.applyFilter(stateIdFilter);
        if (countryFilter) {
            query.country = this.applyFilter(countryFilter);
        }
        const isTextSearch = !!searchTerm?.trim() && searchTerm.trim().length >= 3;
        if (searchTerm?.trim()) {
            const term = searchTerm.trim();
            if (isTextSearch) {
                query.$text = {
                    $search: term,
                };
            }
            else {
                query.name = {
                    $regex: `^${escapeRegex(term)}`,
                    $options: "i",
                };
            }
        }
        // Sorting and Projection
        let sortCriteria = {};
        let projection = {};
        if (isTextSearch && sortBy === "relevance") {
            projection = {
                score: {
                    $meta: "textScore",
                },
            };
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
                City.find(query, projection)
                    .populate("stateId", "name")
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                City.countDocuments(query),
            ]);
            return { data, total, page, totalPages: Math.ceil(total / limit) };
        }
        catch (error) {
            throw new Error(`City fetch failed: ${error.message}`);
        }
    }
    static async updateCity(cityId, updateData) {
        try {
            if (updateData.location?.coordinates) {
                updateData.location = {
                    type: "Point",
                    coordinates: updateData.location.coordinates,
                };
            }
            if (updateData.stateId && updateData.country) {
                const validState = await State.findOne({
                    _id: updateData.stateId,
                    country: updateData.country,
                });
                if (!validState) {
                    throw new Error("State does not belong to country");
                }
            }
            const updatedCity = await City.findByIdAndUpdate(cityId, {
                $set: updateData,
            }, {
                new: true,
                runValidators: true,
            })
                .populate("stateId", "name")
                .lean();
            if (!updatedCity) {
                throw new Error("City not found");
            }
            return updatedCity;
        }
        catch (error) {
            throw new Error(`City Update Failed: ${error.message}`);
        }
    }
    static async softDeleteCity(cityId, status) {
        try {
            const deletedCity = await City.findByIdAndUpdate(cityId, { isActive: status }, { new: true, runValidators: true }).lean();
            if (!deletedCity)
                throw new Error("City not found");
            return deletedCity;
        }
        catch (error) {
            throw new Error(`Delete failed: ${error.message}`);
        }
    }
    static async getCityById(cityId) {
        try {
            const city = await City.findById(cityId).lean().exec();
            if (!city) {
                const error = new Error("city not found");
                error.statusCode = 404;
                throw error;
            }
            return city;
        }
        catch (error) {
            throw new Error(`Failed to get city: ${error.message}`);
        }
    }
}
//# sourceMappingURL=city.service.js.map