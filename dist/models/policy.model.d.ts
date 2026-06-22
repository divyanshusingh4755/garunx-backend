import { Document } from "mongoose";
export interface IContent extends Document {
    type: "TERMS" | "PRIVACY" | "REFUND";
    title: string;
    content: string;
    isActive: boolean;
    version: number;
    publishedAt?: Date;
}
export declare const Content: import("mongoose").Model<IContent, {}, {}, {}, Document<unknown, {}, IContent, {}, import("mongoose").DefaultSchemaOptions> & IContent & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IContent>;
//# sourceMappingURL=policy.model.d.ts.map