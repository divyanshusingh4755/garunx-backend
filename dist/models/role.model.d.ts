import { Types, type Document } from "mongoose";
export interface IRbacRole extends Document {
    name: string;
    key: string;
    description?: string;
    permissions: Types.ObjectId[];
    isActive: boolean;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const RbacRole: import("mongoose").Model<IRbacRole, {}, {}, {}, Document<unknown, {}, IRbacRole, {}, import("mongoose").DefaultSchemaOptions> & IRbacRole & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IRbacRole>;
//# sourceMappingURL=role.model.d.ts.map