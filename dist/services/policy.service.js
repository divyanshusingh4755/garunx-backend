import mongoose, { Types } from "mongoose";
import { Content } from "../models/policy.model.js";
export class PolicyService {
    static ensureValidId(id) {
        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid policy id");
        }
    }
    static async createPolicy(payload) {
        const latestPolicy = await Content.findOne({
            type: payload.type,
            userType: payload.userType,
        })
            .sort({ version: -1 })
            .select("version")
            .lean();
        const version = (latestPolicy?.version ?? 0) + 1;
        const hasActivePolicy = await Content.exists({
            type: payload.type,
            userType: payload.userType,
            isActive: true,
        });
        const policy = await Content.create({
            ...payload,
            version,
            isActive: !hasActivePolicy,
            ...(!hasActivePolicy
                ? {
                    publishedAt: new Date(),
                }
                : {}),
        });
        return policy;
    }
    static async updatePolicy(id, payload) {
        this.ensureValidId(id);
        const policy = await Content.findById(id);
        if (!policy) {
            throw new Error("Policy not found");
        }
        if (payload.title !== undefined) {
            policy.title = payload.title;
        }
        if (payload.content !== undefined) {
            policy.content = payload.content;
        }
        return policy.save();
    }
    static async getAllPolicies(page = 1, limit = 20, isActive, type, userType) {
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
        const skip = (safePage - 1) * safeLimit;
        const query = {};
        if (type) {
            query.type = type;
        }
        if (userType) {
            query.userType = userType;
        }
        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }
        const [data, total] = await Promise.all([
            Content.find(query)
                .sort({
                type: 1,
                userType: 1,
                version: -1,
            })
                .skip(skip)
                .limit(safeLimit)
                .lean(),
            Content.countDocuments(query),
        ]);
        return {
            data,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit),
        };
    }
    static async togglePolicyStatus(id, isActive) {
        this.ensureValidId(id);
        const session = await mongoose.startSession();
        try {
            let updatedPolicy = null;
            await session.withTransaction(async () => {
                const policy = await Content.findById(id).session(session);
                if (!policy) {
                    throw new Error("Policy not found");
                }
                if (isActive) {
                    await Content.updateMany({
                        _id: {
                            $ne: policy._id,
                        },
                        type: policy.type,
                        userType: policy.userType,
                        isActive: true,
                    }, {
                        $set: {
                            isActive: false,
                        },
                    }, { session });
                    policy.isActive = true;
                    policy.publishedAt = new Date();
                }
                else {
                    policy.isActive = false;
                }
                updatedPolicy = await policy.save({
                    session,
                });
            });
            if (!updatedPolicy) {
                throw new Error("Policy status update failed");
            }
            return updatedPolicy;
        }
        finally {
            await session.endSession();
        }
    }
    static async getPolicyByType(type, userType) {
        const policy = await Content.findOne({
            type,
            userType,
            isActive: true,
        })
            .select({
            type: 1,
            userType: 1,
            title: 1,
            content: 1,
            version: 1,
            publishedAt: 1,
        })
            .lean();
        if (!policy) {
            throw new Error(`${type} policy not found`);
        }
        return policy;
    }
}
//# sourceMappingURL=policy.service.js.map