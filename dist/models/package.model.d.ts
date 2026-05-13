import { Types, Document } from "mongoose";
export interface IPackageService {
    serviceId: Types.ObjectId;
    name: string;
    serviceRole: "INCLUDED" | "OPTIONAL";
    defaultTierId?: Types.ObjectId;
    allowedTierIds?: Types.ObjectId[];
    displayOrder?: number;
    isActive?: boolean;
}
export interface IPackage extends Document {
    name: string;
    shortDescription?: string;
    description?: string;
    packageReference: string;
    categoryId: Types.ObjectId;
    services: IPackageService[];
    locations: Types.ObjectId[];
    image?: string;
    pricing: {
        type: "DERIVED" | "FIXED";
        fixedPrice?: number;
        discountPercentage?: number;
    };
    displayOrder?: number;
    isActive: boolean;
    version: number;
    createdBy?: Types.ObjectId;
}
export declare const Package: import("mongoose").Model<IPackage, {}, {}, {}, Document<unknown, {}, IPackage, {}, import("mongoose").DefaultSchemaOptions> & IPackage & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPackage>;
//# sourceMappingURL=package.model.d.ts.map