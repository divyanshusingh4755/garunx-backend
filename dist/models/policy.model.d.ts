import { type Document } from "mongoose";
export type PolicyType = "TERMS" | "PRIVACY" | "REFUND";
export type PolicyUserType = "User" | "Coordinator";
export interface IContent extends Document {
    type: PolicyType;
    userType: PolicyUserType;
    version: number;
    title: string;
    content: string;
    isActive: boolean;
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Content: import("mongoose").Model<IContent, {}, {}, {}, Document<unknown, {}, IContent, {}, import("mongoose").DefaultSchemaOptions> & IContent & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IContent>;
//# sourceMappingURL=policy.model.d.ts.map