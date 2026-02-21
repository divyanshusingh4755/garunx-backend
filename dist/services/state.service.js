import { State } from "../models/state.model.js";
export class StateService {
    static applyFilter(filterValue) {
        if (!filterValue)
            return undefined;
        const values = filterValue.split(',').map(val => val.trim());
        return { $in: values };
    }
    static async createState(state, country, image, description, location) {
        const newState = new State({
            state,
            country,
            image,
            description,
            location
        });
        return await newState.save();
    }
    static async FindState(searchTerm, countryFilter, stateFilter, limit = 40, page = 1, isActive) {
        const skip = limit * (page - 1);
        const query = {};
        if (typeof isActive === 'boolean') {
            query.isActive = isActive;
        }
        else {
            query.isActive = { $ne: false };
        }
        if (searchTerm) {
            query.$text = { $search: searchTerm };
        }
        if (countryFilter)
            query.country = this.applyFilter(countryFilter);
        if (stateFilter)
            query.state = this.applyFilter(stateFilter);
        try {
            const findQuery = State.find(query);
            if (searchTerm) {
                findQuery.
                    select({ score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } });
            }
            else {
                findQuery.sort({ createdAt: -1 });
            }
            const [data, total] = await Promise.all([
                findQuery.skip(skip).limit(limit).lean(),
                State.countDocuments(query)
            ]);
            return {
                data, total, page, totalPages: Math.ceil(total / limit)
            };
        }
        catch (error) {
            throw new Error(`State fetched failed: ${error.message}`);
        }
    }
    static async updateState(stateId, updateData) {
        try {
            if (updateData.location?.coordinates) {
                updateData.location = {
                    type: 'Point',
                    coordinates: updateData.location.coordinates
                };
            }
            const updatedState = await State.findByIdAndUpdate(stateId, { $set: updateData }, { new: true, runValidators: true }).lean();
            if (!updatedState) {
                throw new Error('State not found');
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