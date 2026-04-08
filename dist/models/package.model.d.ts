import { Types, Document } from "mongoose";
export interface IPackageService {
    serviceId: Types.ObjectId;
    displayOrder?: number;
}
export interface IPackage extends Document {
    name: string;
    description?: string;
    services: IPackageService[];
    locations?: string[];
    pricing: {
        type: "DERIVED" | "FIXED";
        fixedPrice?: number;
        discountPercentage?: number;
    };
    displayOrder?: number;
    isActive: boolean;
    createdBy?: Types.ObjectId;
    version: number;
}
export declare const Package: import("mongoose").Model<IPackage, {}, {}, {}, Document<unknown, {}, IPackage, {}, import("mongoose").DefaultSchemaOptions> & IPackage & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPackage>;
//# sourceMappingURL=package.model.d.ts.map