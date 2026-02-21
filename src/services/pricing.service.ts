import type { AnyBulkWriteOperation, MongooseBulkWriteResult } from "mongoose";
import { ServicePricing, type IServicePricing } from "../models/servicepricing.model.js";

export class PricingSerive {
    static async upsertServicePrice(data: { serviceId: string, locationIds: string[], price: number }): Promise<MongooseBulkWriteResult> {
        const { serviceId, locationIds, price } = data;
        try {
            const ids = Array.isArray(locationIds) ? locationIds : [locationIds];

            const operations: AnyBulkWriteOperation<IServicePricing>[] = ids.map(locId => ({
                updateOne: {
                    filter: {
                        serviceId: serviceId as any,
                        locationId: locId as any
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
        } catch (err: any) {
            throw new Error(err.message);
        }
    }


    static async fetchByLocation(locationIds: any) {

        try {
            const ids = Array.isArray(locationIds) ? locationIds : [locationIds];
            return await ServicePricing.find({ locationId: { $in: ids }, isActive: true })
                .populate('serviceId', 'name category image description')
                .populate('locationId', '_id name city state pincode fullAddress')
        } catch (err: any) {
            throw new Error(err.message)
        }
    }

    static async fetchPriceDetails(serviceId: string, locationId: string) {
        try {
            return await ServicePricing.findOne({ serviceId, locationId, isActive: true } as any)
                .populate('serviceId', 'name category image description')
                .populate('locationId', '_id name city state pincode fullAddress')
        } catch (err: any) {
            throw new Error(err.message)
        }
    }

    static async getAllServices(filter: Record<string, any> = {}) {
        try {
            return await ServicePricing.find({
                isActive: true,
                ...filter
            })
                .populate('serviceId', 'name category image description')
                .populate('locationId', '_id name city state pincode fullAddress')
                .sort({ createdAt: -1 })
                .lean(); // Returns POJOs for 5x faster execution
        } catch (err: any) {
            throw new Error(`Failed to fetch service prices: ${err.message}`);
        }
    }

}