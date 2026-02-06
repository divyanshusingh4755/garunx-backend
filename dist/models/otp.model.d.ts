export interface IOTP extends Document {
    phoneNumber: string;
    otp: string;
    createdAt: Date;
}
export declare const Otp: import("mongoose").Model<IOTP, {}, {}, {}, import("mongoose").Document<unknown, {}, IOTP, {}, import("mongoose").DefaultSchemaOptions> & IOTP & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IOTP>;
//# sourceMappingURL=otp.model.d.ts.map