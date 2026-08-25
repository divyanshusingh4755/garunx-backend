import mongoose, { Types } from "mongoose";
import { Content } from "../models/policy.model.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";
export class PolicyService {
    static async invalidatePolicyCache(type, userType) {
        const operations = [
            RedisCacheService.deleteByPattern(CacheKeys.policyListPattern()),
        ];
        if (type && userType) {
            operations.push(RedisCacheService.delete(CacheKeys.policyByType(type, userType)));
        }
        else {
            operations.push(RedisCacheService.deleteByPattern(CacheKeys.policyActivePattern()));
        }
        await Promise.all(operations);
    }
    static ensureValidId(id) { if (!Types.ObjectId.isValid(id)) {
        throw new Error("Invalid policy id");
    } }
    static async createPolicy(payload) {
        const latestPolicy = await Content.findOne({ type: payload.type, userType: payload.userType }).sort({ version: -1 }).select("version").lean();
        const version = (latestPolicy?.version ?? 0) + 1;
        const hasActivePolicy = await Content.exists({ type: payload.type, userType: payload.userType, isActive: true });
        const policy = await Content.create({ ...payload, version, isActive: !hasActivePolicy, ...(!hasActivePolicy ? { publishedAt: new Date() } : {}) });
        await this.invalidatePolicyCache(payload.type, payload.userType);
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
        const updatedPolicy = await policy.save();
        await this.invalidatePolicyCache(policy.type, policy.userType);
        return updatedPolicy;
    }
    static async getAllPolicies(page = 1, limit = 20, isActive, type, userType) {
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
        const cacheKey = CacheKeys.policyList({ page: safePage, limit: safeLimit, isActive, type, userType });
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS.POLICY_LIST,
            loader: async () => {
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
                    Content.find(query).sort({ type: 1, userType: 1, version: -1 }).skip(skip).limit(safeLimit).lean(),
                    Content.countDocuments(query),
                ]);
                return {
                    data, total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit),
                };
            },
        });
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
                    await Content.updateMany({ _id: { $ne: policy._id }, type: policy.type, userType: policy.userType, isActive: true }, { $set: { isActive: false } }, { session });
                    policy.isActive = true;
                    policy.publishedAt = new Date();
                }
                else {
                    policy.isActive = false;
                }
                updatedPolicy = await policy.save({ session });
            });
            if (!updatedPolicy) {
                throw new Error("Policy status update failed");
            }
            await this.invalidatePolicyCache(updatedPolicy.type, updatedPolicy.userType);
            return updatedPolicy;
        }
        finally {
            await session.endSession();
        }
    }
    static async getPolicyByType(type, userType) {
        return RedisCacheService.getOrSet({
            key: CacheKeys.policyByType(type, userType),
            ttlSeconds: CACHE_TTL_SECONDS.POLICY_ACTIVE,
            loader: async () => {
                const policy = await Content.findOne({ type, userType, isActive: true }).select({ type: 1, userType: 1, title: 1, content: 1, version: 1, publishedAt: 1 }).lean();
                if (!policy) {
                    throw new Error(`${type} policy not found`);
                }
                return policy;
            },
        });
    }
    static async exportPoliciesToCsv(policyIds) {
        if (!Array.isArray(policyIds) || policyIds.length === 0) {
            throw new Error("At least one policy ID is required");
        }
        if (policyIds.length > 1000) {
            throw new Error("A maximum of 1000 policies can be exported at once");
        }
        const uniquePolicyIds = [...new Set(policyIds)];
        for (const policyId of uniquePolicyIds) {
            if (!Types.ObjectId.isValid(policyId)) {
                throw new Error("Invalid policy ID");
            }
        }
        const policyObjectIds = uniquePolicyIds.map((policyId) => new Types.ObjectId(policyId));
        const policies = await Content.find({ _id: { $in: policyObjectIds } }).select(["type", "userType", "version", "title", "content", "isActive", "publishedAt", "createdAt", "updatedAt"].join(" ")).lean();
        if (policies.length === 0) {
            throw new Error("No policies found for export");
        }
        // Preserve the same selection order received from the frontend.
        const policyMap = new Map(policies.map((policy) => [policy._id.toString(), policy]));
        const orderedPolicies = uniquePolicyIds.map((policyId) => policyMap.get(policyId)).filter((policy) => Boolean(policy));
        const escapeCsv = (value) => {
            if (value === null || value === undefined) {
                return "";
            }
            const stringValue = String(value);
            // Prevent CSV/spreadsheet formula injection from policy content.
            const safeValue = /^[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue;
            if (safeValue.includes(",") || safeValue.includes('"') || safeValue.includes("\n") || safeValue.includes("\r")) {
                return `"${safeValue.replace(/"/g, '""')}"`;
            }
            return safeValue;
        };
        const formatDate = (value) => {
            if (!value) {
                return "";
            }
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return "";
            }
            return date.toISOString();
        };
        const headers = ["Policy ID", "Type", "User Type", "Version", "Title", "Content", "Active", "Published At", "Created At", "Updated At"];
        const rows = orderedPolicies.map((policy) => [policy._id.toString(), policy.type, policy.userType, policy.version, policy.title, policy.content, policy.isActive, formatDate(policy.publishedAt), formatDate(policy.createdAt), formatDate(policy.updatedAt)]);
        const csv = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
        return { csv, total: orderedPolicies.length };
    }
}
//# sourceMappingURL=policy.service.js.map