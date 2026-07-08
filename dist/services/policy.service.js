import { Types } from "mongoose";
import { Content } from "../models/policy.model.js";
export class PolicyService {
    static async createPolicy(payload) {
        const latestPolicy = await Content.findOne({
            type: payload.type,
            userType: payload.userType,
        })
            .lean();
        const policy = await Content.create({
            ...payload,
        });
        return policy;
    }
    static async updatePolicy(id, payload) {
        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid policy id");
        }
        const policy = await Content.findByIdAndUpdate(id, {
            $set: payload,
        }, {
            new: true,
        });
        if (!policy) {
            throw new Error("Policy not found");
        }
        return policy;
    }
    static async getAllPolicies(page = 1, limit = 20, type, userType) {
        const skip = (page - 1) * limit;
        const query = {};
        if (type) {
            query.type = type;
        }
        if (userType) {
            query.userType = userType;
        }
        const [data, total] = await Promise.all([
            Content.find(query)
                .sort({
                type: 1,
                userType: 1,
            })
                .skip(skip)
                .limit(limit)
                .lean(),
            Content.countDocuments(query),
        ]);
        return {
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    static async togglePolicyStatus(id, isActive) {
        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid policy id");
        }
        const policy = await Content.findById(id);
        if (!policy) {
            throw new Error("Policy not found");
        }
        if (isActive) {
            await Content.updateMany({
                type: policy.type,
                userType: policy.userType,
                isActive: true,
            }, {
                $set: {
                    isActive: false,
                },
            });
            policy.isActive = true;
            policy.publishedAt = new Date();
        }
        else {
            policy.isActive = false;
        }
        await policy.save();
        return policy;
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
        })
            .lean();
        if (!policy) {
            throw new Error(`${type} policy not found`);
        }
        return policy;
    }
}
//# sourceMappingURL=policy.service.js.map