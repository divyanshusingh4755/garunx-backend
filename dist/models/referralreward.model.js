import { Document, model, Schema, Types } from "mongoose";
const referralRewardSchema = new Schema({
    referrerUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    referredUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    bookingId: {
        type: Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
        index: true,
    },
    referrerCouponId: {
        type: Schema.Types.ObjectId,
        ref: "Coupon",
    },
    referredCouponId: {
        type: Schema.Types.ObjectId,
        ref: "Coupon",
    },
    referrerRewardAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    referredRewardAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    status: {
        type: String,
        enum: ["PENDING", "AWARDED", "FAILED"],
        default: "PENDING",
        index: true,
    },
}, {
    timestamps: true,
});
referralRewardSchema.index({
    referredUserId: 1,
}, {
    unique: true,
});
referralRewardSchema.index({
    referrerUserId: 1,
    createdAt: -1,
});
referralRewardSchema.index({
    referredUserId: 1,
    createdAt: -1,
});
referralRewardSchema.index({
    bookingId: 1,
});
export const ReferralReward = model("ReferralReward", referralRewardSchema);
//# sourceMappingURL=referralreward.model.js.map