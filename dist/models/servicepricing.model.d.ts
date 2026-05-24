import { Document, Types } from "mongoose";
export interface IServicePricing extends Document {
    name: string;
    serviceId: Types.ObjectId;
    componentId: Types.ObjectId;
    tierId: Types.ObjectId;
    locationId: Types.ObjectId;
    price: number;
}
export declare const ServicePricing: import("mongoose").Model<IServicePricing, {}, {}, {}, Document<unknown, {}, IServicePricing, {}, import("mongoose").DefaultSchemaOptions> & IServicePricing & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IServicePricing>;
//# sourceMappingURL=servicepricing.model.d.ts.map