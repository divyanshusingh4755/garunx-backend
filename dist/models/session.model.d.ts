import { Types, type Document } from "mongoose";
export interface ISession extends Document {
    userId: Types.ObjectId;
    refreshToken: string;
    deviceInfo?: string;
    ipAddress?: string;
    familyId: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Session: import("mongoose").Model<ISession, {}, {}, {}, Document<unknown, {}, ISession, {}, import("mongoose").DefaultSchemaOptions> & ISession & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ISession>;
//# sourceMappingURL=session.model.d.ts.map