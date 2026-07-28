import { Types, type Document } from "mongoose";
export type FamilyTreeActivityAction = "MEMBER_ADDED" | "MEMBER_UPDATED" | "MEMBER_DELETED" | "MEMBER_RESTORED" | "RELATIONSHIP_LINKED" | "RELATIONSHIP_UNLINKED";
export type FamilyTreeActivitySource = "CUSTOMER_SELF" | "COORDINATOR_BOOKING" | "ADMIN_MANUAL" | "SYSTEM_IMPORT";
export interface IFamilyTreeChange {
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
}
export interface IFamilyTreeActivity extends Document {
    ownerId: Types.ObjectId;
    familyMemberId: Types.ObjectId;
    action: FamilyTreeActivityAction;
    performedBy: Types.ObjectId;
    performedByRole: string;
    source: FamilyTreeActivitySource;
    bookingId?: Types.ObjectId;
    bookingReference?: string;
    changes: IFamilyTreeChange[];
    reason?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}
export declare const FamilyTreeActivity: import("mongoose").Model<IFamilyTreeActivity, {}, {}, {}, Document<unknown, {}, IFamilyTreeActivity, {}, import("mongoose").DefaultSchemaOptions> & IFamilyTreeActivity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IFamilyTreeActivity>;
//# sourceMappingURL=family-tree-activity.model.d.ts.map