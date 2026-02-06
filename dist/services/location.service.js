import { Location } from "../models/location.model.js";
export class LocationService {
    static async createLocation(country, state, city, fullAddress, pincode, image, description, location) {
        const newLocation = new Location({
            country,
            state,
            city,
            fullAddress,
            pincode,
            image,
            description,
            location
        });
        return await newLocation.save();
    }
    static async FindLocation(searchTerm, countryFilter, stateFilter, cityFilter, pincodeFilter, limit = 40, page = 1) {
        const query = { isActive: { $ne: false } };
        if (searchTerm) {
            query.$text = { $search: searchTerm };
        }
        if (countryFilter)
            query.country = countryFilter;
        if (stateFilter)
            query.state = stateFilter;
        if (cityFilter)
            query.city = cityFilter;
        if (pincodeFilter)
            query.pincode = pincodeFilter;
        try {
            const skip = limit * (page - 1);
            const findQuery = Location.find(query);
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
                Location.countDocuments(query)
            ]);
            return {
                data, total, page, totalPages: Math.ceil(total / limit)
            };
        }
        catch (error) {
            throw new Error(`Location fetched failed: ${error.message}`);
        }
    }
    static async updateLocation(locationId, updateData) {
        try {
            if (updateData.location?.coordinates) {
                updateData.location = {
                    type: 'Point',
                    coordinates: updateData.location.coordinates
                };
            }
            const updatedLocation = await Location.findByIdAndUpdate(locationId, { $set: updateData }, { new: true, runValidators: true }).lean();
            if (!updatedLocation) {
                throw new Error('Location not found');
            }
            return updatedLocation;
        }
        catch (error) {
            throw new Error(`Location Update Failed: ${error.message}`);
        }
    }
    static async softDeleteLocation(locationId) {
        try {
            const deletedLocation = await Location.findByIdAndUpdate(locationId, { isActive: false }, { new: true }).lean();
            if (!deletedLocation)
                throw new Error("Location not found");
            return deletedLocation;
        }
        catch (error) {
            throw new Error(`Delete failed: ${error.message}`);
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
}
//# sourceMappingURL=location.service.js.map