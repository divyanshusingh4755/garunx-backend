import { Schema } from "mongoose";
export interface IPackage extends Document {
    name: string;
    includedServices: Schema.Types.ObjectId[];
    locationIds: Schema.Types.ObjectId[];
    packagePrice: number;
    isActive: boolean;
}
export declare const Package: import("mongoose").Model<IPackage, {}, {}, {}, import("mongoose").Document<unknown, {}, IPackage, {}, import("mongoose").DefaultSchemaOptions> & IPackage & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IPackage>;
//# sourceMappingURL=package.model.d.ts.map