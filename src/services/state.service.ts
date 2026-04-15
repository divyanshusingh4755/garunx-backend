import { State, type IState } from "../models/state.model.js";
import type { QueryFilter } from 'mongoose';

export class StateService {
    private static applyFilter(filterValue?: string) {
        if (!filterValue) return undefined;
        const values = filterValue.split(',').map(val => val.trim());
        return { $in: values }
    }

    static async createState(
        state: String,
        country: String,
        image?: String,
        description?: String,
        location?: {
            type: "Point",
            coordinates: [number, number]
        }
    ) {
        const newState = new State({
            state,
            country,
            image,
            description,
            location
        })

        return await newState.save()
    }

    static async FindState(
        searchTerm?: string,
        countryFilter?: string,
        stateFilter?: string,
        limit: number = 40,
        page: number = 1,
        isActive?: boolean,
        sortBy: string = 'createdAt',
        sortOrder: 'asc' | 'desc' = 'desc'
    ) {
        const skip = limit * (page - 1);
        const query: any = {};

        if (typeof isActive === 'boolean') {
            query.isActive = isActive;
        }

        if (searchTerm) query.$text = { $search: searchTerm };
        if (countryFilter) query.country = this.applyFilter(countryFilter);
        if (stateFilter) query.state = this.applyFilter(stateFilter);

        let sortCriteria: any = {};
        let projection: any = {};

        if (searchTerm && sortBy === 'relevance') {
            projection = { score: { $meta: 'textScore' } };
            sortCriteria = { score: { $meta: 'textScore' } };
        } else {
            sortCriteria[sortBy] = sortOrder === 'desc' ? -1 : 1;
            if (sortBy !== 'createdAt') sortCriteria['createdAt'] = -1;
        }

        try {
            const [data, total] = await Promise.all([
                State.find(query, projection)
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                State.countDocuments(query)
            ]);

            return { data, total, page, totalPages: Math.ceil(total / limit) };
        } catch (error: any) {
            throw new Error(`State fetch failed: ${error.message}`);
        }
    }

    static async updateState(stateId: string, updateData: Partial<IState>) {
        try {
            if (updateData.location?.coordinates) {
                (updateData as any).location = {
                    type: 'Point',
                    coordinates: updateData.location.coordinates
                }
            }

            const updatedState = await State.findByIdAndUpdate(
                stateId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).lean()

            if (!updatedState) {
                throw new Error('State not found')
            }
            return updatedState
        } catch (error: any) {
            throw new Error(`State Update Failed: ${error.message}`)
        }
    }

    static async softDeleteState(stateId: string, status: string) {
        try {
            const deletedState = await State.findByIdAndUpdate(
                stateId,
                { isActive: status },
                { new: true, runValidators: true }
            ).lean()

            if (!deletedState) throw new Error("State not found");
            return deletedState;
        } catch (error: any) {
            throw new Error(`Delete failed: ${error.message}`)
        }
    }

    static async getStateById(stateId: string) {
        try {
            const state = await State.findById(stateId).lean().exec();
            if (!state) {
                const error = new Error("state not found");
                (error as any).statusCode = 404;
                throw error
            }
            return state;
        } catch (error: any) {
            throw new Error(`Failed to get state: ${error.message}`)
        }
    }
}