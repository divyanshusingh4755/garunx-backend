import mongoose, { Types } from "mongoose";
import { User } from "../models/user.model.js";
import { ReferralReward } from "../models/referralreward.model.js";
import { Booking } from "../models/booking.model.js";
import { Coupon } from "../models/coupon.model.js";
import { generateCouponCode } from "../utils/generateCouponCode.js";
export class ReferralRewardService {
    static async processReferralReward(userId, bookingId) {
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                const user = await User.findById(userId);
                if (!user) {
                    throw new Error("User not found");
                }
                if (!user.referredBy) {
                    return;
                }
                const existingReward = await ReferralReward.findOne({
                    referredUserId: user._id,
                }).session(session);
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
                const REFERRER_REWARD = 200;
                const referrerCoupon = await Coupon.create([
                    {
                        name: "Referral Reward",
                        couponCode: generateCouponCode("REF"),
                        assignedUserId: referrer._id,
                        applicableOn: "REFERRAL",
                        discount: REFERRER_REWARD,
                        discountType: "FIXED",
                        usageLimit: 1,
                        minOrderAmount: 0,
                        isActive: true,
                    },
                ], { session });
                const REFERRED_REWARD = 100;
                const referredCoupon = await Coupon.create([
                    {
                        name: "Welcome Referral Reward",
                        couponCode: generateCouponCode("WELCOME"),
                        assignedUserId: user._id,
                        applicableOn: "REFERRAL",
                        discount: REFERRED_REWARD,
                        discountType: "FIXED",
                        usageLimit: 1,
                        minOrderAmount: 0,
                        isActive: true,
                    },
                ], { session });
                await ReferralReward.create([
                    {
                        referrerUserId: referrer._id,
                        referredUserId: user._id,
                        bookingId,
                        referrerCouponId: referrerCoupon[0]._id,
                        referredCouponId: referredCoupon[0]._id,
                        referrerRewardAmount: 200,
                        referredRewardAmount: 100,
                        status: "AWARDED",
                    },
                ], { session });
            });
        }
        finally {
            await session.endSession();
        }
    }
    static async getReferralInfo(userId) {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid userId");
        }
        const user = await User.findById(userId).select("name referralCode").lean();
        if (!user) {
            throw new Error("User not found");
        }
        const [totalReferrals, successfulReferrals, totalRewardsEarned] = await Promise.all([
            ReferralReward.countDocuments({
                referrerUserId: userId,
            }),
            ReferralReward.countDocuments({
                referrerUserId: userId,
                status: "AWARDED",
            }),
            ReferralReward.aggregate([
                {
                    $match: {
                        referrerUserId: new Types.ObjectId(userId),
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
            totalRewardsEarned: totalRewardsEarned[0]?.total || 0,
        };
    }
    static async getReferralStats(userId) {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid userId");
        }
        const stats = await ReferralReward.aggregate([
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
            if (item._id === "PENDING") {
                result.pending = {
                    count: item.count,
                    reward: item.totalReward,
                };
            }
            if (item._id === "AWARDED") {
                result.awarded = {
                    count: item.count,
                    reward: item.totalReward,
                };
            }
            if (item._id === "FAILED") {
                result.failed = {
                    count: item.count,
                    reward: item.totalReward,
                };
            }
        }
        return result;
    }
    static async getReferralHistory(userId, page = 1, limit = 20) {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid userId");
        }
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            ReferralReward.find({
                referrerUserId: userId,
            })
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
                .limit(limit)
                .lean(),
            ReferralReward.countDocuments({
                referrerUserId: userId,
            }),
        ]);
        return {
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    static async getReferralRewards(userId, page = 1, limit = 20, status) {
        if (userId && !Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid userId");
        }
        const skip = (page - 1) * limit;
        const query = {};
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
                .limit(limit)
                .lean(),
            ReferralReward.countDocuments(query),
        ]);
        return {
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
}
//# sourceMappingURL=referralreward.service.js.map