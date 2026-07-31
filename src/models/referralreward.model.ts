import {
  model,
  Schema,
  type Document,
  Types,
} from "mongoose";

export type ReferralRewardStatus =
  | "PENDING"
  | "AWARDED"
  | "FAILED";

export interface IReferralReward
  extends Document {
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

const referralRewardSchema =
  new Schema<IReferralReward>(
    {
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
        enum: [
          "PENDING",
          "AWARDED",
          "FAILED",
        ],
        default: "PENDING",
        required: true,
        index: true,
      },
    },
    {
      timestamps: true,
    },
  );

referralRewardSchema.pre(
  "validate",
  function () {
    if (
      this.referrerUserId.toString() ===
      this.referredUserId.toString()
    ) {
      throw new Error(
        "Referrer and referred user cannot be the same",
      );
    }

    if (
      this.status === "AWARDED" &&
      (!this.referrerCouponId ||
        !this.referredCouponId)
    ) {
      throw new Error(
        "Awarded referral rewards require both coupon IDs",
      );
    }
  },
);

referralRewardSchema.index(
  {
    referredUserId: 1,
  },
  {
    unique: true,
    name:
      "UniqueReferralRewardPerReferredUser",
  },
);

referralRewardSchema.index({
  referrerUserId: 1,
  createdAt: -1,
});

referralRewardSchema.index({
  referredUserId: 1,
  createdAt: -1,
});

export const ReferralReward =
  model<IReferralReward>(
    "ReferralReward",
    referralRewardSchema,
  );
