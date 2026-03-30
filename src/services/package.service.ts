import { Package, type IPackage } from "../models/package.model.js";
export class PackageService {
    static async create(data: Partial<IPackage>) {
        try {
            data.isActive = true;

            const newPackage = await Package.create(data);

            return await Package.findById(newPackage._id)
                .populate('includedServices', 'name category')
                .populate('locationIds', 'city pincode');
        } catch (err: any) {
            throw new Error(err.message)
        }
    }

    static async fetchByLocation(locationIds: any) {

        try {
            const ids = Array.isArray(locationIds) ? locationIds : [locationIds];
            return await Package.find({ locationIds: { $in: ids }, isActive: true })
                .populate('includedServices', 'name image category')
                .populate('locationIds', '_id name city state pincode fullAddress')
        } catch (err: any) {
            throw new Error(err.message)
        }
    }

    static async findById(id: string) {
        try {
            return await Package.findById(id)
                .populate('includedServices')
                .populate('locationIds')
        } catch (err: any) {
            throw new Error(err.message)
        }
    }

    static async update(id: string, data: Partial<IPackage>) {
        try {
            return await Package.findByIdAndUpdate(id, data, {
                new: true,
                runValidators: true
            })
        } catch (err: any) {
            throw new Error(err.message)
        }
    }

    static async toggleStatus(id: string, status: boolean) {
        try {
            return await Package.findByIdAndUpdate(id, { isActive: status }, { new: true, runValidators: true })
        } catch (err: any) {
            throw new Error(err.message)
        }
    }

    static async getAllPackages(filter: Record<string, any> = {}) {
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
        } catch (err: any) {
            throw new Error(`Package fetch failed: ${err.message}`);
        }
    }

}