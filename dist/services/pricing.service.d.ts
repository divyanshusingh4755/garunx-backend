import type { MongooseBulkWriteResult } from "mongoose";
import { type IServicePricing } from "../models/servicepricing.model.js";
export declare class PricingSerive {
    static upsertServicePrice(data: {
        serviceId: string;
        locationIds: string[];
        price: number;
    }): Promise<MongooseBulkWriteResult>;
    static fetchByLocation(locationIds: any): Promise<(import("mongoose").Document<unknown, {}, IServicePricing, {}, import("mongoose").DefaultSchemaOptions> & IServicePricing & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    })[]>;
    static fetchPriceDetails(serviceId: string, locationId: string): Promise<(import("mongoose").Document<unknown, {}, IServicePricing, {}, import("mongoose").DefaultSchemaOptions> & IServicePricing & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    static getAllServices(filter?: Record<string, any>): Promise<(IServicePricing & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
}
//# sourceMappingURL=pricing.service.d.ts.map