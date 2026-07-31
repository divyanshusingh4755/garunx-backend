import { type Types } from "mongoose";
export type TaxPriceMode = "EXCLUSIVE" | "INCLUSIVE";
export interface IServicePricing {
    serviceId: Types.ObjectId;
    componentId: Types.ObjectId;
    tierId: Types.ObjectId;
    locationId: Types.ObjectId;
    price: number;
    taxProfileId: Types.ObjectId | null;
    taxPriceMode: TaxPriceMode;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ServicePricing: import("mongoose").Model<IServicePricing, {}, {}, {}, import("mongoose").Document<unknown, {}, IServicePricing, {}, import("mongoose").DefaultSchemaOptions> & IServicePricing & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IServicePricing>;
//# sourceMappingURL=servicepricing.model.d.ts.map