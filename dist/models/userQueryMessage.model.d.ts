import { Types, type Document, type Model } from "mongoose";
export type QueryMessageSenderType = "USER" | "COORDINATOR" | "ADMIN";
export interface IUserQueryMessage extends Document {
    queryId: Types.ObjectId;
    senderId: Types.ObjectId;
    senderType: QueryMessageSenderType;
    message?: string;
    imageUrls: string[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const UserQueryMessage: Model<IUserQueryMessage>;
//# sourceMappingURL=userQueryMessage.model.d.ts.map