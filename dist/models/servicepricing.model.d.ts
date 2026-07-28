import { type Document, Types } from "mongoose";
export type TaxPriceMode = "EXCLUSIVE" | "INCLUSIVE";
export interface IServicePricing extends Document {
    serviceId: Types.ObjectId;
    componentId: Types.ObjectId;
    tierId: Types.ObjectId;
    locationId: Types.ObjectId;
    price: number;
    taxProfileId: Types.ObjectId | null;
    taxPriceMode: TaxPriceMode;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ServicePricing: import("mongoose").Model<IServicePricing, {}, {}, {}, Document<unknown, {}, IServicePricing, {}, import("mongoose").DefaultSchemaOptions> & IServicePricing & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IServicePricing>;
//# sourceMappingURL=servicepricing.model.d.ts.map