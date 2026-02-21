import { Location } from "../models/location.model.js";
export class LocationService {
    static async createLocation(name, country, state, city, fullAddress, pincode, image, description, location) {
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
        });
        return await newLocation.save();
    }
    static applyFilter(filterValue) {
        if (!filterValue)
            return undefined;
        const values = filterValue.split(',').map(val => val.trim());
        return { $in: values };
    }
    static async FindLocation(searchTerm, countryFilter, stateFilter, cityFilter, pincodeFilter, limit = 40, page = 1, isActive) {
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
        if (cityFilter)
            query.city = this.applyFilter(cityFilter);
        if (pincodeFilter)
            query.pincode = this.applyFilter(pincodeFilter);
        try {
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
    static async softDeleteLocation(locationId, status) {
        try {
            const deletedLocation = await Location.findByIdAndUpdate(locationId, { isActive: status }, { new: true, runValidators: true }).lean();
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
    static async getLocationByIds(locationIds) {
        try {
            const locations = await Location.find({ _id: { $in: locationIds } }).lean().exec();
            if (!locations || locations.length === 0) {
                const error = new Error("Locations not found");
                error.statusCode = 404;
                throw error;
            }
            return locations;
        }
        catch (error) {
            throw new Error(`Failed to get locations: ${error.message}`);
        }
    }
    static async searchServicesyLocationDetails(searchQuery) {
        try {
            let locations = await Location.find({ $text: { $search: searchQuery }, isActive: true }, { score: { $meta: "textScore" } })
                .sort({ score: { $meta: "textScore" } })
                .select('_id name city state pincode fullAddress');
            // Fallback if text search is empty
            if (locations.length === 0) {
                locations = await Location.find({
                    $or: [
                        { city: new RegExp(searchQuery, 'i') },
                        { pincode: searchQuery },
                        { state: new RegExp(searchQuery, 'i') }
                    ],
                    isActive: true
                }).select('_id name city state pincode fullAddress');
            }
            return locations;
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
}
//# sourceMappingURL=location.service.js.map