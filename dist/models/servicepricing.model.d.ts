import type { Types } from "mongoose";
interface IServicePricing extends Document {
    name: string;
    serviceId: Types.ObjectId;
    componentId: Types.ObjectId;
    tierId: Types.ObjectId;
    locationId: Types.ObjectId;
    price: number;
}
export declare const ServicePricing: import("mongoose").Model<IServicePricing, {}, {}, {}, import("mongoose").Document<unknown, {}, IServicePricing, {}, import("mongoose").DefaultSchemaOptions> & IServicePricing & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IServicePricing>;
export {};
//# sourceMappingURL=servicepricing.model.d.ts.map