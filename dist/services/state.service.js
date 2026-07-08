import { State } from "../models/state.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
export class StateService {
    static applyFilter(filterValue) {
        if (!filterValue)
            return undefined;
        const values = filterValue.split(",").map((val) => val.trim());
        return { $in: values };
    }
    static async createState(name, country, image, description, location) {
        const newState = new State({
            name,
            country,
            image,
            description,
            location,
        });
        return await newState.save();
    }
    static async FindState(searchTerm, countryFilter, stateFilter, limit = 40, page = 1, isActive, sortBy = "createdAt", sortOrder = "desc") {
        const skip = limit * (page - 1);
        const query = {};
        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }
        if (countryFilter)
            query.country = this.applyFilter(countryFilter);
        if (stateFilter)
            query.state = this.applyFilter(stateFilter);
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
                State.find(query, projection)
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                State.countDocuments(query),
            ]);
            return { data, total, page, totalPages: Math.ceil(total / limit) };
        }
        catch (error) {
            throw new Error(`State fetch failed: ${error.message}`);
        }
    }
    static async updateState(stateId, updateData) {
        try {
            if (updateData.location?.coordinates) {
                updateData.location = {
                    type: "Point",
                    coordinates: updateData.location.coordinates,
                };
            }
            const updatedState = await State.findByIdAndUpdate(stateId, { $set: updateData }, { new: true, runValidators: true }).lean();
            if (!updatedState) {
                throw new Error("State not found");
            }
            return updatedState;
        }
        catch (error) {
            throw new Error(`State Update Failed: ${error.message}`);
        }
    }
    static async softDeleteState(stateId, status) {
        try {
            const deletedState = await State.findByIdAndUpdate(stateId, { isActive: status }, { new: true, runValidators: true }).lean();
            if (!deletedState)
                throw new Error("State not found");
            return deletedState;
        }
        catch (error) {
            throw new Error(`Delete failed: ${error.message}`);
        }
    }
    static async getStateById(stateId) {
        try {
            const state = await State.findById(stateId).lean().exec();
            if (!state) {
                const error = new Error("state not found");
                error.statusCode = 404;
                throw error;
            }
            return state;
        }
        catch (error) {
            throw new Error(`Failed to get state: ${error.message}`);
        }
    }
}
//# sourceMappingURL=state.service.js.map