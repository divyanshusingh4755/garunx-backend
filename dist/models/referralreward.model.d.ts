import { Document, Types } from "mongoose";
export interface IReferralReward extends Document {
    referrerUserId: Types.ObjectId;
    referredUserId: Types.ObjectId;
    bookingId: Types.ObjectId;
    referrerCouponId?: Types.ObjectId;
    referredCouponId?: Types.ObjectId;
    referrerRewardAmount: number;
    referredRewardAmount: number;
    status: "PENDING" | "AWARDED" | "FAILED";
}
export declare const ReferralReward: import("mongoose").Model<IReferralReward, {}, {}, {}, Document<unknown, {}, IReferralReward, {}, import("mongoose").DefaultSchemaOptions> & IReferralReward & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IReferralReward>;
//# sourceMappingURL=referralreward.model.d.ts.map