import { Types } from "mongoose";
type PolicyType = "TERMS" | "PRIVACY" | "REFUND";
interface CreatePolicyPayload {
    type: PolicyType;
    title: string;
    content: string;
}
interface UpdatePolicyPayload {
    title?: string;
    content?: string;
}
export declare class PolicyService {
    static createPolicy(payload: CreatePolicyPayload): Promise<import("mongoose").Document<unknown, {}, import("../models/policy.model.js").IContent, {}, import("mongoose").DefaultSchemaOptions> & import("../models/policy.model.js").IContent & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updatePolicy(id: string, payload: UpdatePolicyPayload): Promise<import("mongoose").Document<unknown, {}, import("../models/policy.model.js").IContent, {}, import("mongoose").DefaultSchemaOptions> & import("../models/policy.model.js").IContent & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getAllPolicies(page?: number, limit?: number, type?: PolicyType): Promise<{
        data: (import("../models/policy.model.js").IContent & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static togglePolicyStatus(id: string, isActive: boolean): Promise<import("mongoose").Document<unknown, {}, import("../models/policy.model.js").IContent, {}, import("mongoose").DefaultSchemaOptions> & import("../models/policy.model.js").IContent & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getPolicyByType(type: PolicyType): Promise<import("../models/policy.model.js").IContent & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
export {};
//# sourceMappingURL=policy.service.d.ts.map