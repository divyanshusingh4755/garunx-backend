import { type Document, Types } from "mongoose";
export type ReferralRewardStatus = "PENDING" | "AWARDED" | "FAILED";
export interface IReferralReward extends Document {
    referrerUserId: Types.ObjectId;
    referredUserId: Types.ObjectId;
    bookingId: Types.ObjectId;
    referrerCouponId?: Types.ObjectId;
    referredCouponId?: Types.ObjectId;
    referrerRewardAmount: number;
    referredRewardAmount: number;
    status: ReferralRewardStatus;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ReferralReward: import("mongoose").Model<IReferralReward, {}, {}, {}, Document<unknown, {}, IReferralReward, {}, import("mongoose").DefaultSchemaOptions> & IReferralReward & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IReferralReward>;
//# sourceMappingURL=referralreward.model.d.ts.map