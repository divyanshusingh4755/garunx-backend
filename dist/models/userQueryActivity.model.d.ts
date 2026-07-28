import { Types, Document, Model } from "mongoose";
export type UserQueryActivityType = "QUERY_CREATED" | "REQUESTER_REPLIED" | "ADMIN_REPLIED" | "STATUS_CHANGED" | "ASSIGNED" | "PRIORITY_CHANGED" | "CATEGORY_CHANGED" | "QUERY_DELETED";
export interface IUserQueryActivity extends Document {
    queryId: Types.ObjectId;
    performedBy: Types.ObjectId;
    type: UserQueryActivityType;
    oldValue?: unknown;
    newValue?: unknown;
    note?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const UserQueryActivity: Model<IUserQueryActivity>;
//# sourceMappingURL=userQueryActivity.model.d.ts.map