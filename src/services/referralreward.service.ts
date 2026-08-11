import mongoose, { Types } from "mongoose";

import { User } from "../models/user.model.js";

import { ReferralReward } from "../models/referralreward.model.js";

import { Booking } from "../models/booking.model.js";

import { Coupon } from "../models/coupon.model.js";

import { generateCouponCode } from "../utils/generateCouponCode.js";

type RewardStatus = "PENDING" | "AWARDED" | "FAILED";

interface RewardQuery {
  referrerUserId?: string;
  status?: RewardStatus;
}

export class ReferralRewardService {
  private static ensureValidObjectId(value: string, fieldName: string): void {
    if (!Types.ObjectId.isValid(value)) {
      throw new Error(`Invalid ${fieldName}`);
    }
  }

  static async processReferralReward(userId: string, bookingId: string) {
    this.ensureValidObjectId(userId, "userId");

    this.ensureValidObjectId(bookingId, "bookingId");

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const user = await User.findById(userId).session(session);

        if (!user) {
          throw new Error("User not found");
        }

        if (!user.referredBy) {
          return;
        }

        if (user.referredBy.toString() === user._id.toString()) {
          return;
        }

        const qualifyingBooking = await Booking.findOne({
          _id: bookingId,
          userId: user._id,
          "payment.status": "PAID",
        })
          .select("_id")
          .session(session)
          .lean();

        if (!qualifyingBooking) {
          throw new Error("Paid booking not found for user");
        }

        const existingReward = await ReferralReward.findOne({
          referredUserId: user._id,
        })
          .select("_id")
          .session(session)
          .lean();

        if (existingReward) {
          return;
        }

        const paidBookings = await Booking.countDocuments({
          userId: user._id,
          "payment.status": "PAID",
        }).session(session);

        if (paidBookings !== 1) {
          return;
        }

        const referrer = await User.findById(user.referredBy).session(session);

        if (!referrer) {
          return;
        }

        const referrerRewardAmount = 200;
        const referredRewardAmount = 100;

        const [referrerCoupon] = await Coupon.create(
          [
            {
              name: "Referral Reward",
              couponCode: generateCouponCode("REF"),
              assignedUserId: referrer._id,
              applicableOn: "REFERRAL",
              services: [],
              packages: [],
              discount: referrerRewardAmount,
              discountType: "FIXED",
              usageLimit: 1,
              minOrderAmount: 0,
              isActive: true,
            },
          ],
          { session },
        );

        const [referredCoupon] = await Coupon.create(
          [
            {
              name: "Welcome Referral Reward",
              couponCode: generateCouponCode("WELCOME"),
              assignedUserId: user._id,
              applicableOn: "REFERRAL",
              services: [],
              packages: [],
              discount: referredRewardAmount,
              discountType: "FIXED",
              usageLimit: 1,
              minOrderAmount: 0,
              isActive: true,
            },
          ],
          { session },
        );

        if (!referrerCoupon || !referredCoupon) {
          throw new Error("Failed to create referral coupons");
        }

        await ReferralReward.create(
          [
            {
              referrerUserId: referrer._id,
              referredUserId: user._id,
              bookingId: qualifyingBooking._id,
              referrerCouponId: referrerCoupon._id,
              referredCouponId: referredCoupon._id,
              referrerRewardAmount,
              referredRewardAmount,
              status: "AWARDED",
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
  }

  static async getReferralInfo(userId: string) {
    this.ensureValidObjectId(userId, "userId");

    const user = await User.findById(userId).select("name referralCode").lean();

    if (!user) {
      throw new Error("User not found");
    }

    const userObjectId = new Types.ObjectId(userId);

    const [totalReferrals, successfulReferrals, totalRewards] =
      await Promise.all([
        ReferralReward.countDocuments({
          referrerUserId: userObjectId,
        }),

        ReferralReward.countDocuments({
          referrerUserId: userObjectId,
          status: "AWARDED",
        }),

        ReferralReward.aggregate<{
          _id: null;
          total: number;
        }>([
          {
            $match: {
              referrerUserId: userObjectId,
              status: "AWARDED",
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: "$referrerRewardAmount",
              },
            },
          },
        ]),
      ]);

    return {
      referralCode: user.referralCode,
      totalReferrals,
      successfulReferrals,
      totalRewardsEarned: totalRewards[0]?.total ?? 0,
    };
  }

  static async getReferralStats(userId: string) {
    this.ensureValidObjectId(userId, "userId");

    const stats = await ReferralReward.aggregate<{
      _id: RewardStatus;
      count: number;
      totalReward: number;
    }>([
      {
        $match: {
          referrerUserId: new Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1,
          },
          totalReward: {
            $sum: "$referrerRewardAmount",
          },
        },
      },
    ]);

    const result = {
      pending: {
        count: 0,
        reward: 0,
      },
      awarded: {
        count: 0,
        reward: 0,
      },
      failed: {
        count: 0,
        reward: 0,
      },
    };

    for (const item of stats) {
      const value = {
        count: item.count,
        reward: item.totalReward,
      };

      if (item._id === "PENDING") {
        result.pending = value;
      } else if (item._id === "AWARDED") {
        result.awarded = value;
      } else if (item._id === "FAILED") {
        result.failed = value;
      }
    }

    return result;
  }

  static async getReferralHistory(userId: string, page = 1, limit = 20) {
    this.ensureValidObjectId(userId, "userId");

    const safePage = Number.isInteger(page) && page > 0 ? page : 1;

    const safeLimit =
      Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;

    const skip = (safePage - 1) * safeLimit;

    const query = {
      referrerUserId: new Types.ObjectId(userId),
    };

    const [data, total] = await Promise.all([
      ReferralReward.find(query)
        .populate({
          path: "referredUserId",
          select: "name email phone",
        })
        .select({
          referredUserId: 1,
          referrerRewardAmount: 1,
          referredRewardAmount: 1,
          status: 1,
          createdAt: 1,
        })
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      ReferralReward.countDocuments(query),
    ]);

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  static async getReferralRewards(
    userId?: string,
    page = 1,
    limit = 20,
    status?: RewardStatus,
  ) {
    if (userId) {
      this.ensureValidObjectId(userId, "userId");
    }

    const safePage = Number.isInteger(page) && page > 0 ? page : 1;

    const safeLimit =
      Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;

    const skip = (safePage - 1) * safeLimit;

    const query: RewardQuery = {};

    if (userId) {
      query.referrerUserId = userId;
    }

    if (status) {
      query.status = status;
    }

    const [data, total] = await Promise.all([
      ReferralReward.find(query)
        .populate({
          path: "bookingId",
          select: "bookingReference status",
        })
        .populate({
          path: "referredUserId",
          select: "name email phone",
        })
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      ReferralReward.countDocuments(query),
    ]);

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }
}
