import { Types, type Document } from "mongoose";
export interface IFamilyTreeDiscoveryToken extends Document {
    requesterId: Types.ObjectId;
    treeOwnerId: Types.ObjectId;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const FamilyTreeDiscoveryToken: import("mongoose").Model<IFamilyTreeDiscoveryToken, {}, {}, {}, Document<unknown, {}, IFamilyTreeDiscoveryToken, {}, import("mongoose").DefaultSchemaOptions> & IFamilyTreeDiscoveryToken & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IFamilyTreeDiscoveryToken>;
//# sourceMappingURL=family-tree-discovery-token.model.d.ts.map