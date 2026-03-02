import { City, type ICity } from "../models/city.model.js";
import type { QueryFilter } from 'mongoose';

export class CityService {

    private static applyFilter(filterValue?: string) {
        if (!filterValue) return undefined;
        const values = filterValue.split(',').map(val => val.trim());
        return { $in: values }
    }

    static async createCity(
        state: String,
        city: String,
        image?: String,
        description?: String,
        location?: {
            type: "Point",
            coordinates: [number, number]
        }
    ) {
        const newCity = new City({
            state,
            city,
            image,
            description,
            location
        })

        return await newCity.save()
    }

    static async FindCity(
        searchTerm?: string,
        cityFilter?: string,
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
        } else {
            query.isActive = { $ne: false };
        }

        if (searchTerm) query.$text = { $search: searchTerm };
        if (cityFilter) query.name = this.applyFilter(cityFilter); // Fixed field name
        if (stateFilter) (query as any).state = this.applyFilter(stateFilter);

        // Sorting Logic
        let sortCriteria: any = {}
        if (searchTerm && sortBy === 'relevance') {
            sortCriteria = { score: { $meta: "textScore" } }
        } else {
            sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
            sortCriteria['createdAt'] = -1;
        }

        try {
            const [data, total] = await Promise.all([
                City.find(query)
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                City.countDocuments(query)
            ]);

            return { data, total, page, totalPages: Math.ceil(total / limit) };
        } catch (error: any) {
            throw new Error(`City fetch failed: ${error.message}`);
        }
    }


    static async updateCity(cityId: string, updateData: Partial<ICity>) {
        try {
            if (updateData.location?.coordinates) {
                (updateData as any).location = {
                    type: 'Point',
                    coordinates: updateData.location.coordinates
                }
            }

            const updatedCity = await City.findByIdAndUpdate(
                cityId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).lean()

            if (!updatedCity) {
                throw new Error('City not found')
            }
            return updatedCity
        } catch (error: any) {
            throw new Error(`City Update Failed: ${error.message}`)
        }
    }

    static async softDeleteCity(cityId: string, status: string) {
        try {
            const deletedCity = await City.findByIdAndUpdate(
                cityId,
                { isActive: status },
                { new: true, runValidators: true }
            ).lean()

            if (!deletedCity) throw new Error("City not found");
            return deletedCity;
        } catch (error: any) {
            throw new Error(`Delete failed: ${error.message}`)
        }
    }

    static async getCityById(cityId: string) {
        try {
            const city = await City.findById(cityId).lean().exec();
            if (!city) {
                const error = new Error("city not found");
                (error as any).statusCode = 404;
                throw error
            }
            return city;
        } catch (error: any) {
            throw new Error(`Failed to get city: ${error.message}`)
        }
    }
}