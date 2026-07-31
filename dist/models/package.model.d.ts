import { Types, Document } from "mongoose";
export interface IPackageLocation {
    name: string;
    isActive: boolean;
    locationId: Types.ObjectId;
}
export interface IPackageTier {
    name: string;
    tierId: Types.ObjectId;
}
export interface IPackage extends Document {
    name: string;
    shortDescription: string;
    fullDescription: string;
    categoryId: Types.ObjectId;
    thumbnailImage: string;
    bannerImage?: string;
    isActive: boolean;
    packageReference: string;
    locations: IPackageLocation[];
    tiers: IPackageTier[];
    isComplete: boolean;
    startingPrice: number;
}
export declare const Package: import("mongoose").Model<IPackage, {}, {}, {}, Document<unknown, {}, IPackage, {}, import("mongoose").DefaultSchemaOptions> & IPackage & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPackage>;
//# sourceMappingURL=package.model.d.ts.map