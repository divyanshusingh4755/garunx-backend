import { type Document } from "mongoose";
export type FaqType = "User" | "Coordinator" | "User_Query" | "Coordinator_Query";
export interface IFAQ extends Document {
    version: number;
    name: string;
    question: string;
    answer: string;
    isActive: boolean;
    displayOrder: number;
    faqType: FaqType;
    createdAt: Date;
    updatedAt: Date;
}
export declare const FAQ: import("mongoose").Model<IFAQ, {}, {}, {}, Document<unknown, {}, IFAQ, {}, import("mongoose").DefaultSchemaOptions> & IFAQ & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IFAQ>;
//# sourceMappingURL=faq.model.d.ts.map