import { Document, Types } from "mongoose";
export interface IComponent extends Document {
    name: string;
    isRemovable: boolean;
    isBundled: boolean;
    categoryId: Types.ObjectId;
    description: string;
    imageUrl?: string;
    isActive: boolean;
}
export declare const Component: import("mongoose").Model<IComponent, {}, {}, {}, Document<unknown, {}, IComponent, {}, import("mongoose").DefaultSchemaOptions> & IComponent & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IComponent>;
//# sourceMappingURL=component.model.d.ts.map