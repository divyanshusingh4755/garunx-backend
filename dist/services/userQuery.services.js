import mongoose, { Types, } from "mongoose";
import { UserQuery, } from "../models/userQuery.model.js";
import { UserQueryMessage, } from "../models/userQueryMessage.model.js";
import { UserQueryActivity, } from "../models/userQueryActivity.model.js";
import { User, } from "../models/user.model.js";
import { Role, } from "../types/rbac.js";
import { escapeRegex, } from "../utils/escapeRegex.js";
export class UserQueryService {
    static validateObjectId(id, fieldName) {
        if (!Types.ObjectId.isValid(id)) {
            throw new Error(`Invalid ${fieldName}`);
        }
    }
    static safePagination(page, limit, defaultLimit) {
        const safePage = Number.isInteger(page) && page > 0
            ? page
            : 1;
        const safeLimit = Number.isInteger(limit) && limit > 0
            ? Math.min(limit, 100)
            : defaultLimit;
        return {
            safePage,
            safeLimit,
            skip: (safePage - 1) * safeLimit,
        };
    }
    static getSortCriteria(sortBy, sortOrder, allowPriority = false) {
        const allowedSortFields = new Set([
            "createdAt",
            "updatedAt",
            "latestMessageAt",
            "lastActionAt",
            ...(allowPriority
                ? ["priority"]
                : []),
        ]);
        const safeSortBy = allowedSortFields.has(sortBy)
            ? sortBy
            : "createdAt";
        const sortCriteria = {
            [safeSortBy]: sortOrder === "asc"
                ? 1
                : -1,
        };
        if (safeSortBy !== "createdAt") {
            sortCriteria.createdAt = -1;
        }
        return sortCriteria;
    }
    static generateQueryReference(queryId) {
        return `QRY-${queryId
            .toString()
            .slice(-8)
            .toUpperCase()}`;
    }
    static async createActivity(input) {
        const activity = {
            queryId: input.queryId,
            performedBy: input.performedBy,
            type: input.type,
        };
        if (Object.prototype.hasOwnProperty.call(input, "oldValue")) {
            activity.oldValue =
                input.oldValue;
        }
        if (Object.prototype.hasOwnProperty.call(input, "newValue")) {
            activity.newValue =
                input.newValue;
        }
        if (input.note !== undefined) {
            activity.note = input.note;
        }
        await UserQueryActivity.create([activity], { session: input.session });
    }
    static async ensureAdmin(adminId, session) {
        let userQuery = User.findById(adminId)
            .select("_id role");
        if (session) {
            userQuery =
                userQuery.session(session);
        }
        const admin = await userQuery;
        if (!admin) {
            throw new Error("Admin not found");
        }
        if (admin.role !== Role.ADMIN) {
            throw new Error("Selected user is not an admin");
        }
        return admin;
    }
    static resolveRequesterType(role) {
        if (role === Role.USER) {
            return "USER";
        }
        if (role === Role.COORDINATOR) {
            return "COORDINATOR";
        }
        throw new Error("Only customers and coordinators can raise queries");
    }
    static resolveMessageSenderType(requesterType) {
        return requesterType === "USER"
            ? "USER"
            : "COORDINATOR";
    }
    static validateMessageContent(message, imageUrls = []) {
        const hasMessage = typeof message === "string" &&
            message.trim().length > 0;
        const hasImages = Array.isArray(imageUrls) &&
            imageUrls.length > 0;
        if (!hasMessage && !hasImages) {
            throw new Error("Message or at least one image is required");
        }
        if (imageUrls.length > 5) {
            throw new Error("A maximum of 5 images is allowed");
        }
    }
    static latestMessageText(message, imageUrls = []) {
        const trimmedMessage = message?.trim();
        return trimmedMessage
            ? trimmedMessage
            : imageUrls.length > 0
                ? "Image sent"
                : "";
    }
    static async createUserQueryService(input) {
        const { requesterId, subject, category, message, imageUrls = [], } = input;
        this.validateObjectId(requesterId, "requester id");
        this.validateMessageContent(message, imageUrls);
        const requesterObjectId = new Types.ObjectId(requesterId);
        const session = await mongoose.startSession();
        try {
            let result = null;
            await session.withTransaction(async () => {
                const requester = await User.findById(requesterObjectId)
                    .select("_id role")
                    .session(session);
                if (!requester) {
                    throw new Error("Requester not found");
                }
                const requesterType = this.resolveRequesterType(requester.role);
                const senderType = this.resolveMessageSenderType(requesterType);
                const queryObjectId = new Types.ObjectId();
                const now = new Date();
                const [queryDocument] = await UserQuery.create([
                    {
                        _id: queryObjectId,
                        requesterId: requesterObjectId,
                        requesterType,
                        queryReference: this.generateQueryReference(queryObjectId),
                        subject: subject.trim(),
                        category,
                        priority: "NORMAL",
                        status: "PENDING",
                        latestMessage: this.latestMessageText(message, imageUrls),
                        latestMessageAt: now,
                        lastAction: "QUERY_CREATED",
                        lastActionAt: now,
                        lastActionBy: requesterObjectId,
                        requesterUnreadCount: 0,
                        adminUnreadCount: 1,
                        isDeleted: false,
                    },
                ], { session });
                if (!queryDocument) {
                    throw new Error("Failed to create query");
                }
                const messagePayload = {
                    queryId: queryDocument._id,
                    senderId: requesterObjectId,
                    senderType,
                    imageUrls,
                };
                if (message?.trim()) {
                    messagePayload.message =
                        message.trim();
                }
                const [messageDocument] = await UserQueryMessage.create([messagePayload], { session });
                if (!messageDocument) {
                    throw new Error("Failed to create query message");
                }
                await this.createActivity({
                    queryId: queryDocument._id,
                    performedBy: requesterObjectId,
                    type: "QUERY_CREATED",
                    newValue: {
                        status: "PENDING",
                        category,
                        priority: "NORMAL",
                        requesterType,
                    },
                    session,
                });
                result = {
                    query: queryDocument,
                    message: messageDocument,
                };
            });
            if (!result) {
                throw new Error("Failed to create query");
            }
            return result;
        }
        finally {
            await session.endSession();
        }
    }
    static async getMyQueries(params) {
        const { requesterId, status, category, limit = 20, page = 1, sortBy = "createdAt", sortOrder = "desc", } = params;
        this.validateObjectId(requesterId, "requester id");
        const { safePage, safeLimit, skip, } = this.safePagination(page, limit, 20);
        const filter = {
            requesterId: new Types.ObjectId(requesterId),
            isDeleted: false,
        };
        if (status) {
            filter.status = status;
        }
        if (category) {
            filter.category = category;
        }
        const sortCriteria = this.getSortCriteria(sortBy, sortOrder);
        const [data, total] = await Promise.all([
            UserQuery.find(filter)
                .populate("assignedAdminId", "fullName profileImage role userReference")
                .sort(sortCriteria)
                .skip(skip)
                .limit(safeLimit)
                .lean(),
            UserQuery.countDocuments(filter),
        ]);
        return {
            data,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit),
        };
    }
    static async getUserQueryById(input) {
        this.validateObjectId(input.queryId, "query id");
        this.validateObjectId(input.requesterId, "requester id");
        const queryObjectId = new Types.ObjectId(input.queryId);
        const queryDocument = await UserQuery.findOne({
            _id: queryObjectId,
            requesterId: new Types.ObjectId(input.requesterId),
            isDeleted: false,
        })
            .populate("assignedAdminId", "fullName profileImage role userReference")
            .lean();
        if (!queryDocument) {
            throw new Error("Query not found");
        }
        const messages = await UserQueryMessage.find({
            queryId: queryObjectId,
        })
            .populate("senderId", "fullName profileImage role userReference")
            .sort({ createdAt: 1 })
            .lean();
        return {
            query: queryDocument,
            messages,
        };
    }
    static async sendUserQueryMessage(input) {
        const { queryId, requesterId, message, imageUrls = [], } = input;
        this.validateObjectId(queryId, "query id");
        this.validateObjectId(requesterId, "requester id");
        this.validateMessageContent(message, imageUrls);
        const queryObjectId = new Types.ObjectId(queryId);
        const requesterObjectId = new Types.ObjectId(requesterId);
        const session = await mongoose.startSession();
        try {
            let result = null;
            await session.withTransaction(async () => {
                const queryDocument = await UserQuery.findOne({
                    _id: queryObjectId,
                    requesterId: requesterObjectId,
                    isDeleted: false,
                }).session(session);
                if (!queryDocument) {
                    throw new Error("Query not found");
                }
                if (queryDocument.status ===
                    "RESOLVED" ||
                    queryDocument.status ===
                        "REJECTED") {
                    throw new Error("Closed query cannot receive new messages");
                }
                const messagePayload = {
                    queryId: queryDocument._id,
                    senderId: requesterObjectId,
                    senderType: this.resolveMessageSenderType(queryDocument
                        .requesterType),
                    imageUrls,
                };
                if (message?.trim()) {
                    messagePayload.message =
                        message.trim();
                }
                const [messageDocument] = await UserQueryMessage.create([messagePayload], { session });
                if (!messageDocument) {
                    throw new Error("Failed to send message");
                }
                const now = new Date();
                queryDocument.latestMessage =
                    this.latestMessageText(message, imageUrls);
                queryDocument.latestMessageAt =
                    now;
                queryDocument.lastAction =
                    "REQUESTER_REPLIED";
                queryDocument.lastActionAt =
                    now;
                queryDocument.lastActionBy =
                    requesterObjectId;
                queryDocument.adminUnreadCount =
                    queryDocument
                        .adminUnreadCount + 1;
                await queryDocument.save({
                    session,
                });
                await this.createActivity({
                    queryId: queryDocument._id,
                    performedBy: requesterObjectId,
                    type: "REQUESTER_REPLIED",
                    session,
                });
                result = messageDocument;
            });
            if (!result) {
                throw new Error("Failed to send message");
            }
            return result;
        }
        finally {
            await session.endSession();
        }
    }
    static async markUserQueryAsRead(input) {
        this.validateObjectId(input.queryId, "query id");
        this.validateObjectId(input.actorId, "user id");
        const actorObjectId = new Types.ObjectId(input.actorId);
        const queryDocument = await UserQuery.findOne({
            _id: new Types.ObjectId(input.queryId),
            isDeleted: false,
        });
        if (!queryDocument) {
            throw new Error("Query not found");
        }
        if (queryDocument.requesterId.equals(actorObjectId)) {
            queryDocument
                .requesterUnreadCount = 0;
            await queryDocument.save();
            return {
                requesterUnreadCount: 0,
                adminUnreadCount: queryDocument
                    .adminUnreadCount,
            };
        }
        await this.ensureAdmin(actorObjectId);
        queryDocument.adminUnreadCount = 0;
        await queryDocument.save();
        return {
            requesterUnreadCount: queryDocument
                .requesterUnreadCount,
            adminUnreadCount: 0,
        };
    }
    static async getAllUserQueries(params) {
        const { searchTerm, status, category, priority, requesterType, assignedAdminId, requesterId, isDeleted = false, limit = 40, page = 1, sortBy = "createdAt", sortOrder = "desc", } = params;
        const { safePage, safeLimit, skip, } = this.safePagination(page, limit, 40);
        const filter = {
            isDeleted,
        };
        if (status) {
            filter.status = status;
        }
        if (category) {
            filter.category = category;
        }
        if (priority) {
            filter.priority = priority;
        }
        if (requesterType) {
            filter.requesterType =
                requesterType;
        }
        if (assignedAdminId) {
            this.validateObjectId(assignedAdminId, "assigned admin id");
            filter.assignedAdminId =
                new Types.ObjectId(assignedAdminId);
        }
        if (requesterId) {
            this.validateObjectId(requesterId, "requester id");
            filter.requesterId =
                new Types.ObjectId(requesterId);
        }
        if (searchTerm?.trim()) {
            const escapedTerm = escapeRegex(searchTerm.trim());
            const regex = new RegExp(escapedTerm, "i");
            const matchingUsers = await User.find({
                $or: [
                    { fullName: regex },
                    { userReference: regex },
                ],
            })
                .select("_id")
                .lean();
            filter.$or = [
                {
                    queryReference: regex,
                },
                {
                    subject: regex,
                },
                {
                    latestMessage: regex,
                },
                {
                    requesterId: {
                        $in: matchingUsers.map((user) => user._id),
                    },
                },
            ];
        }
        const sortCriteria = this.getSortCriteria(sortBy, sortOrder, true);
        const [data, total] = await Promise.all([
            UserQuery.find(filter)
                .populate("requesterId", "fullName profileImage role userReference email")
                .populate("assignedAdminId", "fullName profileImage role userReference")
                .populate("lastActionBy", "fullName role userReference")
                .sort(sortCriteria)
                .skip(skip)
                .limit(safeLimit)
                .lean(),
            UserQuery.countDocuments(filter),
        ]);
        return {
            data,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit),
        };
    }
    static async getAdminUserQueryById(input) {
        this.validateObjectId(input.queryId, "query id");
        this.validateObjectId(input.adminId, "admin id");
        await this.ensureAdmin(new Types.ObjectId(input.adminId));
        const queryObjectId = new Types.ObjectId(input.queryId);
        const queryDocument = await UserQuery.findById(queryObjectId)
            .populate("requesterId", "fullName profileImage role userReference email")
            .populate("assignedAdminId", "fullName profileImage role userReference")
            .populate("resolvedBy", "fullName role userReference")
            .populate("rejectedBy", "fullName role userReference")
            .populate("deletedBy", "fullName role userReference")
            .lean();
        if (!queryDocument) {
            throw new Error("Query not found");
        }
        const [messages, activities,] = await Promise.all([
            UserQueryMessage.find({
                queryId: queryObjectId,
            })
                .populate("senderId", "fullName profileImage role userReference")
                .sort({ createdAt: 1 })
                .lean(),
            UserQueryActivity.find({
                queryId: queryObjectId,
            })
                .populate("performedBy", "fullName profileImage role userReference")
                .sort({ createdAt: -1 })
                .lean(),
        ]);
        return {
            query: queryDocument,
            messages,
            activities,
        };
    }
    static async sendAdminQueryReply(input) {
        const { queryId, adminId, message, imageUrls = [], } = input;
        this.validateObjectId(queryId, "query id");
        this.validateObjectId(adminId, "admin id");
        this.validateMessageContent(message, imageUrls);
        const queryObjectId = new Types.ObjectId(queryId);
        const adminObjectId = new Types.ObjectId(adminId);
        const session = await mongoose.startSession();
        try {
            let result = null;
            await session.withTransaction(async () => {
                await this.ensureAdmin(adminObjectId, session);
                const queryDocument = await UserQuery.findOne({
                    _id: queryObjectId,
                    isDeleted: false,
                }).session(session);
                if (!queryDocument) {
                    throw new Error("Query not found");
                }
                if (queryDocument.status ===
                    "RESOLVED" ||
                    queryDocument.status ===
                        "REJECTED") {
                    throw new Error("Closed query cannot receive new replies");
                }
                const now = new Date();
                if (queryDocument.status ===
                    "PENDING") {
                    queryDocument.status =
                        "ONGOING";
                    await this.createActivity({
                        queryId: queryDocument._id,
                        performedBy: adminObjectId,
                        type: "STATUS_CHANGED",
                        oldValue: {
                            status: "PENDING",
                        },
                        newValue: {
                            status: "ONGOING",
                        },
                        note: "Query moved to ongoing after admin reply",
                        session,
                    });
                }
                const messagePayload = {
                    queryId: queryDocument._id,
                    senderId: adminObjectId,
                    senderType: "ADMIN",
                    imageUrls,
                };
                if (message?.trim()) {
                    messagePayload.message =
                        message.trim();
                }
                const [messageDocument] = await UserQueryMessage.create([messagePayload], { session });
                if (!messageDocument) {
                    throw new Error("Failed to send reply");
                }
                queryDocument.latestMessage =
                    this.latestMessageText(message, imageUrls);
                queryDocument.latestMessageAt =
                    now;
                queryDocument.lastAction =
                    "ADMIN_REPLIED";
                queryDocument.lastActionAt =
                    now;
                queryDocument.lastActionBy =
                    adminObjectId;
                queryDocument.adminUnreadCount =
                    0;
                queryDocument
                    .requesterUnreadCount =
                    queryDocument
                        .requesterUnreadCount + 1;
                await queryDocument.save({
                    session,
                });
                await this.createActivity({
                    queryId: queryDocument._id,
                    performedBy: adminObjectId,
                    type: "ADMIN_REPLIED",
                    session,
                });
                result = messageDocument;
            });
            if (!result) {
                throw new Error("Failed to send reply");
            }
            return result;
        }
        finally {
            await session.endSession();
        }
    }
    static async updateUserQueryStatus(input) {
        const { queryId, adminId, status, reason, } = input;
        this.validateObjectId(queryId, "query id");
        this.validateObjectId(adminId, "admin id");
        const allowedTransitions = {
            PENDING: [
                "ONGOING",
                "RESOLVED",
                "REJECTED",
            ],
            ONGOING: [
                "RESOLVED",
                "REJECTED",
            ],
            RESOLVED: [
                "ONGOING",
            ],
            REJECTED: [],
        };
        const queryObjectId = new Types.ObjectId(queryId);
        const adminObjectId = new Types.ObjectId(adminId);
        const session = await mongoose.startSession();
        try {
            let result = null;
            await session.withTransaction(async () => {
                await this.ensureAdmin(adminObjectId, session);
                const queryDocument = await UserQuery.findOne({
                    _id: queryObjectId,
                    isDeleted: false,
                }).session(session);
                if (!queryDocument) {
                    throw new Error("Query not found");
                }
                const oldStatus = queryDocument.status;
                if (oldStatus === status) {
                    throw new Error(`Query is already ${status.toLowerCase()}`);
                }
                if (!allowedTransitions[oldStatus].includes(status)) {
                    throw new Error(`Cannot change query status from ${oldStatus} to ${status}`);
                }
                if (status === "REJECTED" &&
                    !reason?.trim()) {
                    throw new Error("Rejection reason is required");
                }
                const now = new Date();
                queryDocument.status =
                    status;
                if (status === "RESOLVED") {
                    queryDocument.resolvedAt =
                        now;
                    queryDocument.resolvedBy =
                        adminObjectId;
                    delete queryDocument.rejectedAt;
                    delete queryDocument.rejectedBy;
                    delete queryDocument
                        .rejectionReason;
                }
                if (oldStatus === "RESOLVED" &&
                    status === "ONGOING") {
                    delete queryDocument.resolvedAt;
                    delete queryDocument.resolvedBy;
                }
                if (status === "REJECTED") {
                    queryDocument.rejectedAt =
                        now;
                    queryDocument.rejectedBy =
                        adminObjectId;
                    queryDocument
                        .rejectionReason =
                        reason.trim();
                    delete queryDocument.resolvedAt;
                    delete queryDocument.resolvedBy;
                }
                queryDocument.lastAction =
                    "STATUS_CHANGED";
                queryDocument.lastActionAt =
                    now;
                queryDocument.lastActionBy =
                    adminObjectId;
                result =
                    await queryDocument.save({
                        session,
                    });
                const activityInput = {
                    queryId: queryDocument._id,
                    performedBy: adminObjectId,
                    type: "STATUS_CHANGED",
                    oldValue: {
                        status: oldStatus,
                    },
                    newValue: {
                        status,
                    },
                    session,
                };
                if (reason?.trim()) {
                    activityInput.note =
                        reason.trim();
                }
                await this.createActivity(activityInput);
            });
            if (!result) {
                throw new Error("Failed to update query status");
            }
            return result;
        }
        finally {
            await session.endSession();
        }
    }
    static async updateUserQueryPriority(input) {
        return this.updateSimpleField({
            queryId: input.queryId,
            adminId: input.adminId,
            field: "priority",
            newValue: input.priority,
            activityType: "PRIORITY_CHANGED",
            ...(input.reason !== undefined
                ? { reason: input.reason }
                : {}),
        });
    }
    static async updateUserQueryCategory(input) {
        return this.updateSimpleField({
            queryId: input.queryId,
            adminId: input.adminId,
            field: "category",
            newValue: input.category,
            activityType: "CATEGORY_CHANGED",
            ...(input.reason !== undefined
                ? { reason: input.reason }
                : {}),
        });
    }
    static async updateSimpleField(input) {
        this.validateObjectId(input.queryId, "query id");
        this.validateObjectId(input.adminId, "admin id");
        const queryObjectId = new Types.ObjectId(input.queryId);
        const adminObjectId = new Types.ObjectId(input.adminId);
        const session = await mongoose.startSession();
        try {
            let result = null;
            await session.withTransaction(async () => {
                await this.ensureAdmin(adminObjectId, session);
                const queryDocument = await UserQuery.findOne({
                    _id: queryObjectId,
                    isDeleted: false,
                }).session(session);
                if (!queryDocument) {
                    throw new Error("Query not found");
                }
                const oldValue = queryDocument[input.field];
                if (oldValue ===
                    input.newValue) {
                    throw new Error(`Query ${input.field} is already ${String(input.newValue).toLowerCase()}`);
                }
                queryDocument.set(input.field, input.newValue);
                queryDocument.lastAction =
                    input.activityType;
                queryDocument.lastActionAt =
                    new Date();
                queryDocument.lastActionBy =
                    adminObjectId;
                result =
                    await queryDocument.save({
                        session,
                    });
                const activityInput = {
                    queryId: queryDocument._id,
                    performedBy: adminObjectId,
                    type: input.activityType,
                    oldValue: {
                        [input.field]: oldValue,
                    },
                    newValue: {
                        [input.field]: input.newValue,
                    },
                    session,
                };
                if (input.reason?.trim()) {
                    activityInput.note =
                        input.reason.trim();
                }
                await this.createActivity(activityInput);
            });
            if (!result) {
                throw new Error(`Failed to update query ${input.field}`);
            }
            return result;
        }
        finally {
            await session.endSession();
        }
    }
    static async assignUserQuery(input) {
        this.validateObjectId(input.queryId, "query id");
        this.validateObjectId(input.adminId, "admin id");
        this.validateObjectId(input.performedBy, "performed by id");
        const queryObjectId = new Types.ObjectId(input.queryId);
        const adminObjectId = new Types.ObjectId(input.adminId);
        const performedByObjectId = new Types.ObjectId(input.performedBy);
        const session = await mongoose.startSession();
        try {
            let result = null;
            await session.withTransaction(async () => {
                await this.ensureAdmin(performedByObjectId, session);
                await this.ensureAdmin(adminObjectId, session);
                const queryDocument = await UserQuery.findOne({
                    _id: queryObjectId,
                    isDeleted: false,
                }).session(session);
                if (!queryDocument) {
                    throw new Error("Query not found");
                }
                const oldAdminId = queryDocument
                    .assignedAdminId;
                if (oldAdminId?.equals(adminObjectId)) {
                    throw new Error("Query is already assigned to this admin");
                }
                queryDocument
                    .assignedAdminId =
                    adminObjectId;
                queryDocument.lastAction =
                    "ASSIGNED";
                queryDocument.lastActionAt =
                    new Date();
                queryDocument.lastActionBy =
                    performedByObjectId;
                result =
                    await queryDocument.save({
                        session,
                    });
                await this.createActivity({
                    queryId: queryDocument._id,
                    performedBy: performedByObjectId,
                    type: "ASSIGNED",
                    oldValue: {
                        assignedAdminId: oldAdminId ?? null,
                    },
                    newValue: {
                        assignedAdminId: adminObjectId,
                    },
                    session,
                });
            });
            if (!result) {
                throw new Error("Failed to assign query");
            }
            return result;
        }
        finally {
            await session.endSession();
        }
    }
    static async deleteUserQuery(input) {
        this.validateObjectId(input.queryId, "query id");
        this.validateObjectId(input.adminId, "admin id");
        if (!input.reason.trim()) {
            throw new Error("Deletion reason is required");
        }
        const queryObjectId = new Types.ObjectId(input.queryId);
        const adminObjectId = new Types.ObjectId(input.adminId);
        const session = await mongoose.startSession();
        try {
            let result = null;
            await session.withTransaction(async () => {
                await this.ensureAdmin(adminObjectId, session);
                const queryDocument = await UserQuery.findById(queryObjectId).session(session);
                if (!queryDocument) {
                    throw new Error("Query not found");
                }
                if (queryDocument.isDeleted) {
                    throw new Error("Query is already deleted");
                }
                const now = new Date();
                queryDocument.isDeleted =
                    true;
                queryDocument.deletedAt =
                    now;
                queryDocument.deletedBy =
                    adminObjectId;
                queryDocument.deletionReason =
                    input.reason.trim();
                queryDocument.lastAction =
                    "QUERY_DELETED";
                queryDocument.lastActionAt =
                    now;
                queryDocument.lastActionBy =
                    adminObjectId;
                result =
                    await queryDocument.save({
                        session,
                    });
                await this.createActivity({
                    queryId: queryDocument._id,
                    performedBy: adminObjectId,
                    type: "QUERY_DELETED",
                    newValue: {
                        isDeleted: true,
                    },
                    note: input.reason.trim(),
                    session,
                });
            });
            if (!result) {
                throw new Error("Failed to delete query");
            }
            return result;
        }
        finally {
            await session.endSession();
        }
    }
}
//# sourceMappingURL=userQuery.services.js.map