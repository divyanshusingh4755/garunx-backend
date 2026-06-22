import { Types } from "mongoose";
export declare class ReferralRewardService {
    static processReferralReward(userId: string, bookingId: string): Promise<void>;
    static getReferralInfo(userId: string): Promise<{
        referralCode: string | undefined;
        totalReferrals: number;
        successfulReferrals: number;
        totalRewardsEarned: any;
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
        totalPages: number;
    }>;
    static getReferralRewards(userId?: string, page?: number, limit?: number, status?: "PENDING" | "AWARDED" | "FAILED"): Promise<{
        data: (import("../models/referralreward.model.js").IReferralReward & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
//# sourceMappingURL=referralreward.service.d.ts.map