import { Document } from "mongoose";
export interface IVariant {
    location: string;
    tier: string;
    price: number;
    description?: string;
}
export interface IProduct extends Document {
    name: string;
    isRemovable: boolean;
    categoryName: string;
    description: string;
    imageUrl?: string;
    adminNotes?: string;
    variants: IVariant[];
}
export declare const Product: import("mongoose").Model<IProduct, {}, {}, {}, Document<unknown, {}, IProduct, {}, import("mongoose").DefaultSchemaOptions> & IProduct & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IProduct>;
//# sourceMappingURL=product.model.d.ts.map