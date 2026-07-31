import { Types, type Document, type Model } from "mongoose";
export type UserQueryStatus = "PENDING" | "ONGOING" | "RESOLVED" | "REJECTED";
export type UserQueryCategory = "BOOKING" | "PAYMENT" | "REFUND" | "SERVICE" | "PACKAGE" | "ACCOUNT" | "TECHNICAL" | "OTHER";
export type UserQueryPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type UserQueryRequesterType = "USER" | "COORDINATOR";
export type UserQueryLastAction = "QUERY_CREATED" | "REQUESTER_REPLIED" | "ADMIN_REPLIED" | "STATUS_CHANGED" | "ASSIGNED" | "PRIORITY_CHANGED" | "CATEGORY_CHANGED" | "QUERY_DELETED";
export interface IUserQuery extends Document {
    requesterId: Types.ObjectId;
    requesterType: UserQueryRequesterType;
    queryReference: string;
    subject: string;
    category: UserQueryCategory;
    priority: UserQueryPriority;
    status: UserQueryStatus;
    assignedAdminId?: Types.ObjectId;
    latestMessage?: string;
    latestMessageAt?: Date;
    lastAction: UserQueryLastAction;
    lastActionAt: Date;
    lastActionBy: Types.ObjectId;
    requesterUnreadCount: number;
    adminUnreadCount: number;
    resolvedAt?: Date;
    resolvedBy?: Types.ObjectId;
    rejectedAt?: Date;
    rejectedBy?: Types.ObjectId;
    rejectionReason?: string;
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: Types.ObjectId;
    deletionReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const UserQuery: Model<IUserQuery>;
//# sourceMappingURL=userQuery.model.d.ts.map