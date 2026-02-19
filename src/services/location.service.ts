import { Location, type ILocation } from "../models/location.model.js";

export class LocationService {
    static async createLocation(
        name: String,
        country: String,
        state: String,
        city: String,
        fullAddress: String,
        pincode: String,
        image?: String,
        description?: String,
        location?: {
            type: "Point",
            coordinates: [number, number]
        }
    ) {
        const newLocation = new Location({
            name,
            country,
            state,
            city,
            fullAddress,
            pincode,
            image,
            description,
            location
        })

        return await newLocation.save()
    }

    private static applyFilter(filterValue?: string) {
        if (!filterValue) return undefined;
        const values = filterValue.split(',').map(val => val.trim());
        return { $in: values }
    }

    static async FindLocation(
        searchTerm?: string,
        countryFilter?: string,
        stateFilter?: string,
        cityFilter?: string,
        pincodeFilter?: string,
        limit: number = 40,
        page: number = 1
    ) {
        const query: any = { isActive: { $ne: false } }

        if (searchTerm) {
            query.$text = { $search: searchTerm };
        }

        if (countryFilter) query.country = this.applyFilter(countryFilter);
        if (stateFilter) query.state = this.applyFilter(stateFilter);
        if (cityFilter) query.city = this.applyFilter(cityFilter);
        if (pincodeFilter) query.pincode = this.applyFilter(pincodeFilter);

        try {
            const skip = limit * (page - 1)
            const findQuery = Location.find(query);
            if (searchTerm) {
                findQuery.
                    select({ score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
            } else {
                findQuery.sort({ createdAt: -1 })
            }

            const [data, total] = await Promise.all([
                findQuery.skip(skip).limit(limit).lean(),
                Location.countDocuments(query)
            ])

            return {
                data, total, page, totalPages: Math.ceil(total / limit)
            }
        } catch (error: any) {
            throw new Error(`Location fetched failed: ${error.message}`)
        }
    }

    static async updateLocation(locationId: string, updateData: Partial<ILocation>) {
        try {
            if (updateData.location?.coordinates) {
                (updateData as any).location = {
                    type: 'Point',
                    coordinates: updateData.location.coordinates
                }
            }

            const updatedLocation = await Location.findByIdAndUpdate(
                locationId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).lean()

            if (!updatedLocation) {
                throw new Error('Location not found')
            }
            return updatedLocation
        } catch (error: any) {
            throw new Error(`Location Update Failed: ${error.message}`)
        }
    }

    static async softDeleteLocation(locationId: string, status: string) {
        try {
            const deletedLocation = await Location.findByIdAndUpdate(
                locationId,
                { isActive: status },
                { new: true, runValidators: true }
            ).lean()

            if (!deletedLocation) throw new Error("Location not found");
            return deletedLocation;
        } catch (error: any) {
            throw new Error(`Delete failed: ${error.message}`)
        }
    }

    static async getLocationById(locationId: string) {
        try {
            const location = await Location.findById(locationId).lean().exec();
            if (!location) {
                const error = new Error("Location not found");
                (error as any).statusCode = 404;
                throw error
            }
            return location;
        } catch (error: any) {
            throw new Error(`Failed to get location: ${error.message}`)
        }
    }

    static async searchServicesyLocationDetails(searchQuery: any) {
        try {
            let locations = await Location.find(
                { $text: { $search: searchQuery }, isActive: true },
                { score: { $meta: "textScore" } }
            )
                .sort({ score: { $meta: "textScore" } })
                .select('_id name city state pincode fullAddress')

            // Fallback if text search is empty
            if (locations.length === 0) {
                locations = await Location.find({
                    $or: [
                        { city: new RegExp(searchQuery, 'i') },
                        { pincode: searchQuery },
                        { state: new RegExp(searchQuery, 'i') }
                    ],
                    isActive: true
                }).select('_id name city state pincode fullAddress')
            }

            return locations
        } catch (error: any) {
            throw new Error(error.message)
        }
    }
}