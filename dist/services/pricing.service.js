import { ServicePricing } from "../models/servicepricing.model.js";
export class PricingSerive {
    static async upsertServicePrice(data) {
        const { serviceId, locationIds, price } = data;
        try {
            const ids = Array.isArray(locationIds) ? locationIds : [locationIds];
            const operations = ids.map(locId => ({
                updateOne: {
                    filter: {
                        serviceId: serviceId,
                        locationId: locId
                    },
                    update: {
                        $set: {
                            price,
                            isActive: true
                        }
                    },
                    upsert: true,
                }
            }));
            return await ServicePricing.bulkWrite(operations);
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    static async fetchByLocation(locationIds) {
        try {
            const ids = Array.isArray(locationIds) ? locationIds : [locationIds];
            return await ServicePricing.find({ locationId: { $in: ids }, isActive: true })
                .populate('serviceId', 'name category image description')
                .populate('locationId', '_id name city state pincode fullAddress');
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    static async fetchPriceDetails(serviceId, locationId) {
        try {
            return await ServicePricing.findOne({ serviceId, locationId, isActive: true })
                .populate('serviceId', 'name category image description')
                .populate('locationId', '_id name city state pincode fullAddress');
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    static async getAllSerivces() {
        try {
            return await ServicePricing.find()
                .populate('serviceId', 'name category image description')
                .populate('locationId', '_id name city state pincode fullAddress');
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
}
//# sourceMappingURL=pricing.service.js.map