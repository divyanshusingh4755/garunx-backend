import { Types } from "mongoose";
export interface ISession extends Document {
    userId: Types.ObjectId;
    refreshToken: String;
    deviceInfo?: String;
    ipAddress?: String;
    familyId: string;
    expiresAt: Date;
}
export declare const Session: import("mongoose").Model<ISession, {}, {}, {}, import("mongoose").Document<unknown, {}, ISession, {}, import("mongoose").DefaultSchemaOptions> & ISession & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, ISession>;
//# sourceMappingURL=session.model.d.ts.map