import { Types, Document } from "mongoose";
interface IPackageItem {
    productId: Types.ObjectId;
    variantSelection?: {
        tier?: string;
    };
    isOptional?: boolean;
    isEditable?: boolean;
    quantity: number;
}
export interface IPackage extends Document {
    name: string;
    slug: string;
    description?: string;
    applicableServices?: Types.ObjectId[];
    locations?: string[];
    items: IPackageItem[];
    pricing: {
        type: "DERIVED" | "FIXED";
        fixedPrice?: number;
        discountPercentage?: number;
    };
    displayOrder?: number;
    isActive: boolean;
    createdBy?: Types.ObjectId;
    version: number;
    isDeleted: boolean;
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