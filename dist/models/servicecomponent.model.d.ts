import { Document, type Types } from "mongoose";
export interface IServiceComponent extends Document {
    name: string;
    serviceId: Types.ObjectId;
    componentId: Types.ObjectId;
    tierId: Types.ObjectId;
    isRequired: boolean;
    items?: {
        itemId: Types.ObjectId;
        name: string;
    }[];
}
export declare const ServiceComponent: import("mongoose").Model<IServiceComponent, {}, {}, {}, Document<unknown, {}, IServiceComponent, {}, import("mongoose").DefaultSchemaOptions> & IServiceComponent & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IServiceComponent>;
//# sourceMappingURL=servicecomponent.model.d.ts.map