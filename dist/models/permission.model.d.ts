import { type Document } from "mongoose";
export interface IPermission extends Document {
    name: string;
    key: string;
    module: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Permission: import("mongoose").Model<IPermission, {}, {}, {}, Document<unknown, {}, IPermission, {}, import("mongoose").DefaultSchemaOptions> & IPermission & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPermission>;
//# sourceMappingURL=permission.model.d.ts.map