import { Document, Types } from "mongoose";
export type TaxPriceMode = "EXCLUSIVE" | "INCLUSIVE";
export interface IPackageTierPricing extends Document {
    packageId: Types.ObjectId;
    tierId: Types.ObjectId;
    locationId: Types.ObjectId;
    serviceId: Types.ObjectId;
    basePrice: number;
    fixedPrice?: number | null;
    discountPercent?: number | null;
    finalPrice: number;
    taxProfileId: Types.ObjectId;
    taxPriceMode: TaxPriceMode;
}
export declare const PackageTierPricing: import("mongoose").Model<IPackageTierPricing, {}, {}, {}, Document<unknown, {}, IPackageTierPricing, {}, import("mongoose").DefaultSchemaOptions> & IPackageTierPricing & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPackageTierPricing>;
//# sourceMappingURL=packagetierpricing.model.d.ts.map