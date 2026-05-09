import { Document, type Types } from "mongoose";
export interface ISubServiceComponent extends Document {
    name: string;
    description: string;
    serviceId: Types.ObjectId;
    image?: string;
    isActive: boolean;
}
export declare const SubServiceComponent: import("mongoose").Model<ISubServiceComponent, {}, {}, {}, Document<unknown, {}, ISubServiceComponent, {}, import("mongoose").DefaultSchemaOptions> & ISubServiceComponent & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ISubServiceComponent>;
//# sourceMappingURL=subservices.model.d.ts.map