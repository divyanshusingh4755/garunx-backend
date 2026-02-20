import { City, type ICity } from "../models/city.model.js";

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
        page: number = 1
    ) {
        const query: any = { isActive: { $ne: false } }

        if (searchTerm) {
            query.$text = { $search: searchTerm };
        }

        if (cityFilter) query.country = this.applyFilter(cityFilter);
        if (stateFilter) query.state = this.applyFilter(stateFilter);

        try {
            const skip = limit * (page - 1)
            const findQuery = City.find(query);
            if (searchTerm) {
                findQuery.
                    select({ score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
            } else {
                findQuery.sort({ createdAt: -1 })
            }

            const [data, total] = await Promise.all([
                findQuery.skip(skip).limit(limit).lean(),
                City.countDocuments(query)
            ])

            return {
                data, total, page, totalPages: Math.ceil(total / limit)
            }
        } catch (error: any) {
            throw new Error(`City fetched failed: ${error.message}`)
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