import { type Types } from "mongoose";
export interface ISubServiceComponent {
    name: string;
    description: string;
    serviceId: Types.ObjectId;
    image?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SubServiceComponent: import("mongoose").Model<ISubServiceComponent, {}, {}, {}, import("mongoose").Document<unknown, {}, ISubServiceComponent, {}, import("mongoose").DefaultSchemaOptions> & ISubServiceComponent & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, ISubServiceComponent>;
//# sourceMappingURL=subservices.model.d.ts.map