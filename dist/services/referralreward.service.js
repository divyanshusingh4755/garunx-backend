import mongoose, { Types } from "mongoose";
import { User } from "../models/user.model.js";
import { ReferralReward } from "../models/referralreward.model.js";
import { Booking } from "../models/booking.model.js";
import { Coupon } from "../models/coupon.model.js";
import { generateCouponCode } from "../utils/generateCouponCode.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";
import { Role } from "../types/rbac.js";
import { NotificationService } from "./notification.service.js";
export class ReferralRewardService {
    static async invalidateReferralCache(referrerUserId) {
        await Promise.all([
            RedisCacheService.delete(CacheKeys.referralInfo(referrerUserId)),
            RedisCacheService.delete(CacheKeys.referralStats(referrerUserId)),
            RedisCacheService.deleteByPattern(CacheKeys.referralHistoryPattern(referrerUserId)),
            RedisCacheService.deleteByPattern(CacheKeys.referralRewardListPattern()),
        ]);
    }
    static ensureValidObjectId(value, fieldName) { if (!Types.ObjectId.isValid(value)) {
        throw new Error(`Invalid ${fieldName}`);
    } }
    static async sendReferralCouponNotification(params) {
        try {
            const recipient = await User.findById(params.assignedUserId).select("_id role email").lean();
            if (!recipient) {
                console.error(`[REFERRAL NOTIFICATION] User ${params.assignedUserId} not found`);
                return;
            }
            await NotificationService.createFromTemplate({
                recipientId: recipient._id,
                recipientRole: recipient.role,
                templateCode: "REFERRAL_COUPON_ASSIGNED",
                variables: {
                    couponCode: params.couponCode,
                    couponName: params.couponName,
                    discountText: `₹${params.discount}`,
                    validityText: "No expiry date",
                },
                referenceId: params.couponId,
                dedupeKey: `referral-coupon:${params.couponId}`,
                channels: { email: Boolean(recipient.email), push: true },
            });
        }
        catch (error) {
            // Reward and coupon are already committed. Notification failure must never undo the successful referral reward.
            console.error(`[REFERRAL NOTIFICATION] Failed for coupon ${params.couponId}:`, error);
        }
    }
    static async processReferralReward(userId, bookingId) {
        this.ensureValidObjectId(userId, "userId");
        this.ensureValidObjectId(bookingId, "bookingId");
        const session = await mongoose.startSession();
        let affectedReferrerUserId = null;
        let createdReferrerCoupon = null;
        let createdReferredCoupon = null;
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
                const qualifyingBooking = await Booking.findOne({ _id: bookingId, userId: user._id, "payment.status": "PAID" }).select("_id").session(session).lean();
                if (!qualifyingBooking) {
                    throw new Error("Paid booking not found for user");
                }
                const existingReward = await ReferralReward.findOne({ referredUserId: user._id }).select("_id").session(session).lean();
                if (existingReward) {
                    return;
                }
                const paidBookings = await Booking.countDocuments({ userId: user._id, "payment.status": "PAID" }).session(session);
                if (paidBookings !== 1) {
                    return;
                }
                const referrer = await User.findOne({ _id: user.referredBy, role: Role.USER, isActive: true }).session(session);
                if (!referrer) {
                    return;
                }
                const referrerRewardAmount = 200;
                const referredRewardAmount = 100;
                const [referrerCoupon] = await Coupon.create([
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
                ], { session });
                const [referredCoupon] = await Coupon.create([
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
                ], { session });
                if (!referrerCoupon || !referredCoupon) {
                    throw new Error("Failed to create referral coupons");
                }
                await ReferralReward.create([
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
                ], { session });
                // Only mark cache invalidation after the reward is actually created.
                affectedReferrerUserId = referrer._id.toString();
            });
            // Mongo transaction has committed here.
            if (affectedReferrerUserId) {
                await Promise.all([
                    this.invalidateReferralCache(affectedReferrerUserId),
                    RedisCacheService.deleteByPattern(CacheKeys.couponListPattern()),
                ]);
            }
            const notificationTasks = [];
            if (createdReferrerCoupon) {
                notificationTasks.push(this.sendReferralCouponNotification(createdReferrerCoupon));
            }
            if (createdReferredCoupon) {
                notificationTasks.push(this.sendReferralCouponNotification(createdReferredCoupon));
            }
            if (notificationTasks.length > 0) {
                await Promise.all(notificationTasks);
            }
        }
        finally {
            await session.endSession();
        }
    }
    static async getReferralInfo(userId) {
        this.ensureValidObjectId(userId, "userId");
        return RedisCacheService.getOrSet({
            key: CacheKeys.referralInfo(userId),
            ttlSeconds: CACHE_TTL_SECONDS.REFERRAL_INFO,
            loader: async () => {
                const user = await User.findById(userId).select("fullName referralCode").lean();
                if (!user) {
                    throw new Error("User not found");
                }
                const userObjectId = new Types.ObjectId(userId);
                const [totalReferrals, successfulReferrals, totalRewards] = await Promise.all([
                    User.countDocuments({ referredBy: userObjectId, role: Role.USER }),
                    ReferralReward.countDocuments({ referrerUserId: userObjectId, status: "AWARDED" }),
                    ReferralReward.aggregate([
                        { $match: { referrerUserId: userObjectId, status: "AWARDED" } },
                        { $group: { _id: null, total: { $sum: "$referrerRewardAmount" } } },
                    ]),
                ]);
                return {
                    referralCode: user.referralCode, totalReferrals, successfulReferrals, totalRewardsEarned: totalRewards[0]?.total ?? 0,
                };
            },
        });
    }
    static async getReferralStats(userId) {
        this.ensureValidObjectId(userId, "userId");
        return RedisCacheService.getOrSet({
            key: CacheKeys.referralStats(userId),
            ttlSeconds: CACHE_TTL_SECONDS.REFERRAL_STATS,
            loader: async () => {
                const stats = await ReferralReward.aggregate([
                    { $match: { referrerUserId: new Types.ObjectId(userId) } },
                    { $group: { _id: "$status", count: { $sum: 1 }, totalReward: { $sum: "$referrerRewardAmount" } } },
                ]);
                const result = {
                    pending: { count: 0, reward: 0 }, awarded: { count: 0, reward: 0 }, failed: { count: 0, reward: 0 },
                };
                for (const item of stats) {
                    const value = { count: item.count, reward: item.totalReward };
                    if (item._id === "PENDING") {
                        result.pending = value;
                    }
                    else if (item._id === "AWARDED") {
                        result.awarded = value;
                    }
                    else if (item._id === "FAILED") {
                        result.failed = value;
                    }
                }
                return result;
            },
        });
    }
    static async getReferralHistory(userId, page = 1, limit = 20) {
        this.ensureValidObjectId(userId, "userId");
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
        const cacheKey = CacheKeys.referralHistory(userId, { page: safePage, limit: safeLimit });
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS.REFERRAL_HISTORY,
            loader: async () => {
                const skip = (safePage - 1) * safeLimit;
                const query = { referrerUserId: new Types.ObjectId(userId) };
                const [data, total] = await Promise.all([
                    ReferralReward.find(query)
                        .populate({ path: "referredUserId", select: "fullName email phoneNumber" })
                        .select({ referredUserId: 1, referrerRewardAmount: 1, referredRewardAmount: 1, status: 1, createdAt: 1 })
                        .sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
                    ReferralReward.countDocuments(query),
                ]);
                return {
                    data, total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit),
                };
            },
        });
    }
    static async getReferralRewards(userId, page = 1, limit = 20, status) {
        if (userId) {
            this.ensureValidObjectId(userId, "userId");
        }
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
        const cacheKey = CacheKeys.referralRewardList({ userId, status, page: safePage, limit: safeLimit });
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS.REFERRAL_REWARD_LIST,
            loader: async () => {
                const skip = (safePage - 1) * safeLimit;
                const query = {};
                if (userId) {
                    query.referrerUserId = userId;
                }
                if (status) {
                    query.status = status;
                }
                const [data, total] = await Promise.all([
                    ReferralReward.find(query)
                        .populate({ path: "bookingId", select: "bookingReference status" })
                        .populate({ path: "referredUserId", select: "fullName email phoneNumber" })
                        .sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
                    ReferralReward.countDocuments(query),
                ]);
                return {
                    data, total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit),
                };
            },
        });
    }
    static async exportReferralRewardsToCsv(rewardIds) {
        const uniqueRewardIds = [...new Set(rewardIds)];
        // Route validation already protects this, but keeping service validation makes the service safe when called from elsewhere.
        if (uniqueRewardIds.length === 0 || uniqueRewardIds.length > 1000) {
            throw new Error("rewardIds must contain between 1 and 1000 reward IDs");
        }
        if (!uniqueRewardIds.every((id) => Types.ObjectId.isValid(id))) {
            throw new Error("One or more reward IDs are invalid");
        }
        const rewards = await ReferralReward.find({ _id: { $in: uniqueRewardIds } })
            .populate({ path: "referrerUserId", select: "userReference fullName email phoneNumber" })
            .populate({ path: "referredUserId", select: "userReference fullName email phoneNumber" })
            .populate({ path: "bookingId", select: "bookingReference status" })
            .populate({ path: "referrerCouponId", select: "couponCode" })
            .populate({ path: "referredCouponId", select: "couponCode" })
            .sort({ createdAt: -1 }).lean();
        if (rewards.length === 0) {
            throw new Error("No referral rewards found for export");
        }
        const escapeCsv = (value) => {
            if (value === null || value === undefined) {
                return "";
            }
            let stringValue = String(value);
            // Protect exported CSV files from spreadsheet formula injection.
            if (/^[=+\-@]/.test(stringValue)) {
                stringValue = `'${stringValue}`;
            }
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n") || stringValue.includes("\r")) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };
        const getPopulatedValue = (value) => {
            if (value && typeof value === "object" && !Array.isArray(value)) {
                return value;
            }
            return null;
        };
        const headers = ["Reward ID", "Referrer Reference", "Referrer Name", "Referrer Email", "Referrer Phone", "Referred User Reference", "Referred User Name", "Referred User Email", "Referred User Phone", "Booking Reference", "Booking Status", "Referrer Reward Amount", "Referred Reward Amount", "Referrer Coupon Code", "Referred Coupon Code", "Reward Status", "Created At"];
        const rows = rewards.map((reward) => {
            const referrer = getPopulatedValue(reward.referrerUserId);
            const referredUser = getPopulatedValue(reward.referredUserId);
            const booking = getPopulatedValue(reward.bookingId);
            const referrerCoupon = getPopulatedValue(reward.referrerCouponId);
            const referredCoupon = getPopulatedValue(reward.referredCouponId);
            return [
                reward._id.toString(),
                referrer?.userReference,
                referrer?.fullName,
                referrer?.email,
                referrer?.phoneNumber,
                referredUser?.userReference,
                referredUser?.fullName,
                referredUser?.email,
                referredUser?.phoneNumber,
                booking?.bookingReference,
                booking?.status,
                reward.referrerRewardAmount,
                reward.referredRewardAmount,
                referrerCoupon?.couponCode,
                referredCoupon?.couponCode,
                reward.status,
                reward.createdAt ? new Date(reward.createdAt).toISOString() : "",
            ];
        });
        const csv = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
        return { csv, total: rewards.length };
    }
}
//# sourceMappingURL=referralreward.service.js.map