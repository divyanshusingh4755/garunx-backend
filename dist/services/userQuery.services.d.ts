import { Types } from "mongoose";
import { type UserQueryStatus, type UserQueryCategory, type UserQueryPriority, type UserQueryRequesterType } from "../models/userQuery.model.js";
interface CreateUserQueryInput {
    requesterId: string;
    subject: string;
    category: UserQueryCategory;
    message?: string | null;
    imageUrls?: string[];
}
interface SendUserMessageInput {
    queryId: string;
    requesterId: string;
    message?: string | null;
    imageUrls?: string[];
}
interface MarkQueryAsReadInput {
    queryId: string;
    actorId: string;
}
interface AdminReplyInput {
    queryId: string;
    adminId: string;
    message?: string | null;
    imageUrls?: string[];
}
interface UpdateStatusInput {
    queryId: string;
    adminId: string;
    status: UserQueryStatus;
    reason?: string | null;
}
interface UpdatePriorityInput {
    queryId: string;
    adminId: string;
    priority: UserQueryPriority;
    reason?: string | null;
}
interface UpdateCategoryInput {
    queryId: string;
    adminId: string;
    category: UserQueryCategory;
    reason?: string | null;
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
    private static invalidateUserQueryCache;
    private static validateObjectId;
    private static safePagination;
    private static getSortCriteria;
    private static generateQueryReference;
    private static createActivity;
    private static ensureAdmin;
    private static resolveRequesterType;
    private static resolveMessageSenderType;
    private static validateMessageContent;
    private static latestMessageText;
    static createUserQueryService(input: CreateUserQueryInput): Promise<never>;
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
        limit: number;
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
    static sendUserQueryMessage(input: SendUserMessageInput): Promise<never>;
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
        limit: number;
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
    static sendAdminQueryReply(input: AdminReplyInput): Promise<never>;
    static updateUserQueryStatus(input: UpdateStatusInput): Promise<never>;
    static updateUserQueryPriority(input: UpdatePriorityInput): Promise<never>;
    static updateUserQueryCategory(input: UpdateCategoryInput): Promise<never>;
    private static updateSimpleField;
    static assignUserQuery(input: AssignQueryInput): Promise<never>;
    static deleteUserQuery(input: DeleteQueryInput): Promise<never>;
    static exportUserQueriesToCsv(queryIds: string[]): Promise<{
        csv: string;
        total: number;
    }>;
}
export {};
//# sourceMappingURL=userQuery.services.d.ts.map