import { Document } from "mongoose";
export interface IComponentItem extends Document {
    name: string;
    price?: number;
    isActive: boolean;
}
export declare const ComponentItem: import("mongoose").Model<IComponentItem, {}, {}, {}, Document<unknown, {}, IComponentItem, {}, import("mongoose").DefaultSchemaOptions> & IComponentItem & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IComponentItem>;
//# sourceMappingURL=componentitem.model.d.ts.map