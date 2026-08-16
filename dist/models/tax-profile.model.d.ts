import { Types, type Document } from "mongoose";
import { TaxTreatment } from "../types/tax.types.js";
export interface ITaxProfile extends Document {
    name: string;
    code: string;
    treatment: TaxTreatment;
    pricingRevision: number;
    totalRate: number;
    description?: string;
    isActive: boolean;
    createdBy?: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const TaxProfile: import("mongoose").Model<ITaxProfile, {}, {}, {}, Document<unknown, {}, ITaxProfile, {}, import("mongoose").DefaultSchemaOptions> & ITaxProfile & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ITaxProfile>;
//# sourceMappingURL=tax-profile.model.d.ts.map