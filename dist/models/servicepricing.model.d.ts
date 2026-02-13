import { Schema } from "mongoose";
export interface IServicePricing extends Document {
    serviceId: Schema.Types.ObjectId;
    locationId: Schema.Types.ObjectId;
    price: number;
    isActive: boolean;
}
export declare const ServicePricing: import("mongoose").Model<IServicePricing, {}, {}, {}, import("mongoose").Document<unknown, {}, IServicePricing, {}, import("mongoose").DefaultSchemaOptions> & IServicePricing & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IServicePricing>;
//# sourceMappingURL=servicepricing.model.d.ts.map