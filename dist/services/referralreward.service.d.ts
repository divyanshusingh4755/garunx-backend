import { Types } from "mongoose";
type RewardStatus = "PENDING" | "AWARDED" | "FAILED";
export declare class ReferralRewardService {
    private static invalidateReferralCache;
    private static ensureValidObjectId;
    private static sendReferralCouponNotification;
    static processReferralReward(userId: string, bookingId: string): Promise<void>;
    static getReferralInfo(userId: string): Promise<{
        referralCode: string | undefined;
        totalReferrals: number;
        successfulReferrals: number;
        totalRewardsEarned: number;
    }>;
    static getReferralStats(userId: string): Promise<{
        pending: {
            count: number;
            reward: number;
        };
        awarded: {
            count: number;
            reward: number;
        };
        failed: {
            count: number;
            reward: number;
        };
    }>;
    static getReferralHistory(userId: string, page?: number, limit?: number): Promise<{
        data: (import("../models/referralreward.model.js").IReferralReward & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    static getReferralRewards(userId?: string, page?: number, limit?: number, status?: RewardStatus): Promise<{
        data: (import("../models/referralreward.model.js").IReferralReward & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    static exportReferralRewardsToCsv(rewardIds: string[]): Promise<{
        csv: string;
        total: number;
    }>;
}
export {};
//# sourceMappingURL=referralreward.service.d.ts.map