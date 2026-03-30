import { Package } from "../models/package.model.js";
export class PackageService {
    static async create(data) {
        try {
            data.isActive = true;
            const newPackage = await Package.create(data);
            return await Package.findById(newPackage._id)
                .populate('includedServices', 'name category')
                .populate('locationIds', 'city pincode');
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    static async fetchByLocation(locationIds) {
        try {
            const ids = Array.isArray(locationIds) ? locationIds : [locationIds];
            return await Package.find({ locationIds: { $in: ids }, isActive: true })
                .populate('includedServices', 'name image category')
                .populate('locationIds', '_id name city state pincode fullAddress');
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    static async findById(id) {
        try {
            return await Package.findById(id)
                .populate('includedServices')
                .populate('locationIds');
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    static async update(id, data) {
        try {
            return await Package.findByIdAndUpdate(id, data, {
                new: true,
                runValidators: true
            });
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    static async toggleStatus(id, status) {
        try {
            return await Package.findByIdAndUpdate(id, { isActive: status }, { new: true, runValidators: true });
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    static async getAllPackages(filter = {}) {
        try {
            const finalFilter = {
                isActive: true,
                ...filter
            };
            return await Package.find(finalFilter)
                .populate('includedServices', 'name')
                .populate('locationIds', 'city state')
                .sort({ createdAt: -1 })
                .lean();
        }
        catch (err) {
            throw new Error(`Package fetch failed: ${err.message}`);
        }
    }
}
//# sourceMappingURL=package.service.js.map