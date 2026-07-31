import { type Types } from "mongoose";
export interface IComponent {
    name: string;
    isRemovable: boolean;
    isBundled: boolean;
    categoryId: Types.ObjectId;
    description: string;
    imageUrl?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Component: import("mongoose").Model<IComponent, {}, {}, {}, import("mongoose").Document<unknown, {}, IComponent, {}, import("mongoose").DefaultSchemaOptions> & IComponent & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IComponent>;
//# sourceMappingURL=component.model.d.ts.map