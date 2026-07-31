import { type Types } from "mongoose";
export interface IServiceComponentItem {
    itemId: Types.ObjectId;
    name: string;
}
export interface IServiceComponent {
    name: string;
    description: string;
    serviceId: Types.ObjectId;
    componentId: Types.ObjectId;
    tierId: Types.ObjectId;
    isRequired: boolean;
    items: IServiceComponentItem[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const ServiceComponent: import("mongoose").Model<IServiceComponent, {}, {}, {}, import("mongoose").Document<unknown, {}, IServiceComponent, {}, import("mongoose").DefaultSchemaOptions> & IServiceComponent & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IServiceComponent>;
//# sourceMappingURL=servicecomponent.model.d.ts.map