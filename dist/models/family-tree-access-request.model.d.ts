import { Types, type Document } from "mongoose";
export type FamilyTreeAccessRequestType = "INVITATION" | "JOIN_REQUEST";
export type FamilyTreeAccessRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export interface IFamilyTreeAccessRequest extends Document {
    treeOwnerId: Types.ObjectId;
    familyMemberId?: Types.ObjectId | null;
    requesterId?: Types.ObjectId | null;
    type: FamilyTreeAccessRequestType;
    status: FamilyTreeAccessRequestStatus;
    invitationTokenHash?: string | null;
    invitationExpiresAt?: Date | null;
    createdBy: Types.ObjectId;
    decidedBy?: Types.ObjectId | null;
    invitedEmail?: string | null;
    invitedPhoneNumber?: string | null;
    decidedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare const FamilyTreeAccessRequest: import("mongoose").Model<IFamilyTreeAccessRequest, {}, {}, {}, Document<unknown, {}, IFamilyTreeAccessRequest, {}, import("mongoose").DefaultSchemaOptions> & IFamilyTreeAccessRequest & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IFamilyTreeAccessRequest>;
//# sourceMappingURL=family-tree-access-request.model.d.ts.map