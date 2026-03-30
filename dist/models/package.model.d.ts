import { Types, Document } from "mongoose";
interface IPackageItem {
    productId: Types.ObjectId;
    variantTier: string;
    quantity: number;
}
interface IPackagePrice {
    location: string;
    price: number;
    originalPrice?: number;
}
export interface IPackage extends Document {
    name: string;
    description: string;
    category: string;
    items: IPackageItem[];
    locationPrices: IPackagePrice[];
    isActive: boolean;
    thumbnailImage: string;
}
export declare const Package: import("mongoose").Model<IPackage, {}, {}, {}, Document<unknown, {}, IPackage, {}, import("mongoose").DefaultSchemaOptions> & IPackage & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPackage>;
export {};
//# sourceMappingURL=package.model.d.ts.map