import { Document, Types } from "mongoose";
export interface IPackageTierService {
    serviceId: Types.ObjectId;
    name: string;
    isRequired: boolean;
    isRelated: boolean;
}
export interface IPackageTierMap extends Document {
    packageId: Types.ObjectId;
    tierId: Types.ObjectId;
    services: IPackageTierService[];
}
export declare const PackageTierMap: import("mongoose").Model<IPackageTierMap, {}, {}, {}, Document<unknown, {}, IPackageTierMap, {}, import("mongoose").DefaultSchemaOptions> & IPackageTierMap & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPackageTierMap>;
//# sourceMappingURL=packagetiermap.model.d.ts.map