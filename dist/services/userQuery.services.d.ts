import { Types } from "mongoose";
import { type UserQueryStatus, type UserQueryCategory, type UserQueryPriority, type UserQueryRequesterType } from "../models/userQuery.model.js";
interface CreateUserQueryInput {
    requesterId: string;
    subject: string;
    category: UserQueryCategory;
    message?: string;
    imageUrls?: string[];
}
interface SendUserMessageInput {
    queryId: string;
    requesterId: string;
    message?: string;
    imageUrls?: string[];
}
interface MarkQueryAsReadInput {
    queryId: string;
    requesterId: string;
}
interface AdminReplyInput {
    queryId: string;
    adminId: string;
    message?: string;
    imageUrls?: string[];
}
interface UpdateStatusInput {
    queryId: string;
    adminId: string;
    status: UserQueryStatus;
    reason?: string;
}
interface UpdatePriorityInput {
    queryId: string;
    adminId: string;
    priority: UserQueryPriority;
    reason?: string;
}
interface UpdateCategoryInput {
    queryId: string;
    adminId: string;
    category: UserQueryCategory;
    reason?: string;
}
interface AssignQueryInput {
    queryId: string;
    adminId: string;
    performedBy: string;
}
interface DeleteQueryInput {
    queryId: string;
    adminId: string;
    reason: string;
}
export declare class UserQueryService {
    private static validateObjectId;
    private static generateQueryReference;
    private static createActivity;
    private static ensureAdmin;
    private static resolveRequesterType;
    private static validateMessageContent;
    static createUserQueryService(input: CreateUserQueryInput): Promise<undefined>;
    static getMyQueries(params: {
        requesterId: string;
        status?: UserQueryStatus;
        category?: UserQueryCategory;
        limit?: number;
        page?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: (import("../models/userQuery.model.js").IUserQuery & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static getUserQueryById(input: {
        queryId: string;
        requesterId: string;
    }): Promise<{
        query: import("../models/userQuery.model.js").IUserQuery & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        };
        messages: (import("../models/userQueryMessage.model.js").IUserQueryMessage & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static sendUserQueryMessage(input: SendUserMessageInput): Promise<undefined>;
    static markUserQueryAsRead(input: MarkQueryAsReadInput): Promise<{
        requesterUnreadCount: number;
        adminUnreadCount: number;
    }>;
    static getAllUserQueries(params: {
        searchTerm?: string;
        status?: UserQueryStatus;
        category?: UserQueryCategory;
        priority?: UserQueryPriority;
        requesterType?: UserQueryRequesterType;
        assignedAdminId?: string;
        requesterId?: string;
        isDeleted?: boolean;
        limit?: number;
        page?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: (import("../models/userQuery.model.js").IUserQuery & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static getAdminUserQueryById(input: {
        queryId: string;
        adminId: string;
    }): Promise<{
        query: import("../models/userQuery.model.js").IUserQuery & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        };
        messages: (import("../models/userQueryMessage.model.js").IUserQueryMessage & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        activities: (import("../models/userQueryActivity.model.js").IUserQueryActivity & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static sendAdminQueryReply(input: AdminReplyInput): Promise<undefined>;
    static updateUserQueryStatus(input: UpdateStatusInput): Promise<undefined>;
    static updateUserQueryPriority(input: UpdatePriorityInput): Promise<undefined>;
    static updateUserQueryCategory(input: UpdateCategoryInput): Promise<undefined>;
    static assignUserQuery(input: AssignQueryInput): Promise<undefined>;
    static deleteUserQuery(input: DeleteQueryInput): Promise<undefined>;
}
export {};
//# sourceMappingURL=userQuery.services.d.ts.map