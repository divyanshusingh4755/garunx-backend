import { Types } from "mongoose";
type PolicyType = "TERMS" | "PRIVACY" | "REFUND";
type UserType = "User" | "Coordinator";
interface CreatePolicyPayload {
    type: PolicyType;
    userType: UserType;
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
    static getAllPolicies(page?: number, limit?: number, isActive?: boolean, type?: PolicyType, userType?: UserType): Promise<{
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
    static getPolicyByType(type: PolicyType, userType: UserType): Promise<import("../models/policy.model.js").IContent & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
export {};
//# sourceMappingURL=policy.service.d.ts.map