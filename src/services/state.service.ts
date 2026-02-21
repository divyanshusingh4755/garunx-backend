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
        isActive?: boolean
    ) {
        const skip = limit * (page - 1);
        const query: QueryFilter<IState> = {};

        if (typeof isActive === 'boolean') {
            query.isActive = isActive;
        } else {
            query.isActive = { $ne: false };
        }

        if (searchTerm) {
            query.$text = { $search: searchTerm };
        }

        if (countryFilter) (query as any).country = this.applyFilter(countryFilter);
        if (stateFilter) (query as any).state = this.applyFilter(stateFilter);

        try {
            const findQuery = State.find(query);
            if (searchTerm) {
                findQuery.
                    select({ score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
            } else {
                findQuery.sort({ createdAt: -1 })
            }

            const [data, total] = await Promise.all([
                findQuery.skip(skip).limit(limit).lean(),
                State.countDocuments(query)
            ])

            return {
                data, total, page, totalPages: Math.ceil(total / limit)
            }
        } catch (error: any) {
            throw new Error(`State fetched failed: ${error.message}`)
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