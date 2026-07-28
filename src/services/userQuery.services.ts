import mongoose, {
    Types,
    type ClientSession,
} from "mongoose";

import {
    UserQuery,
    type UserQueryStatus,
    type UserQueryCategory,
    type UserQueryPriority,
    type UserQueryRequesterType,
} from "../models/userQuery.model.js";

import {
    UserQueryMessage,
} from "../models/userQueryMessage.model.js";

import {
    UserQueryActivity,
    type UserQueryActivityType,
} from "../models/userQueryActivity.model.js";

import { User } from "../models/user.model.js";
import { Role } from "../types/rbac.js";


// ========================================
// INPUT TYPES
// ========================================

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


export class UserQueryService {

    // ========================================
    // PRIVATE HELPERS
    // ========================================

    private static validateObjectId(
        id: string,
        fieldName: string,
    ) {
        if (!Types.ObjectId.isValid(id)) {
            throw new Error(
                `Invalid ${fieldName}`,
            );
        }
    }


    private static generateQueryReference(
        queryId: Types.ObjectId,
    ) {
        return `QRY-${queryId
            .toString()
            .slice(-8)
            .toUpperCase()}`;
    }


    private static async createActivity(
        input: {
            queryId: Types.ObjectId;
            performedBy: Types.ObjectId;
            type: UserQueryActivityType;
            oldValue?: unknown;
            newValue?: unknown;
            note?: string;
            session: ClientSession;
        },
    ) {
        const {
            queryId,
            performedBy,
            type,
            oldValue,
            newValue,
            note,
            session,
        } = input;

        await UserQueryActivity.create(
            [
                {
                    queryId,
                    performedBy,
                    type,

                    ...(oldValue !== undefined && {
                        oldValue,
                    }),

                    ...(newValue !== undefined && {
                        newValue,
                    }),

                    ...(note !== undefined && {
                        note,
                    }),
                },
            ],
            {
                session,
            },
        );
    }


    // ========================================
    // ENSURE ADMIN
    // ========================================

    private static async ensureAdmin(
        adminId: Types.ObjectId,
        session?: ClientSession,
    ) {
        let query =
            User.findById(adminId)
                .select("_id role");

        if (session) {
            query =
                query.session(session);
        }

        const admin =
            await query;

        if (!admin) {
            throw new Error(
                "Admin not found",
            );
        }

        if (
            admin.role !==
            Role.ADMIN
        ) {
            throw new Error(
                "Selected user is not an admin",
            );
        }

        return admin;
    }


    // ========================================
    // RESOLVE REQUESTER TYPE
    // ========================================

    private static resolveRequesterType(
        role: Role,
    ): UserQueryRequesterType {

        if (
            role ===
            Role.USER
        ) {
            return "USER";
        }

        if (
            role ===
            Role.COORDINATOR
        ) {
            return "COORDINATOR";
        }

        throw new Error(
            "Only customers and coordinators can raise queries",
        );
    }


    // ========================================
    // VALIDATE MESSAGE / IMAGES
    // ========================================

    private static validateMessageContent(
        message?: string,
        imageUrls?: string[],
    ) {
        const hasMessage =
            typeof message === "string" &&
            message.trim().length > 0;

        const hasImages =
            Array.isArray(imageUrls) &&
            imageUrls.length > 0;

        if (
            !hasMessage &&
            !hasImages
        ) {
            throw new Error(
                "Message or at least one image is required",
            );
        }
    }


    // ========================================
    // CREATE QUERY
    // USER + COORDINATOR
    // ========================================

    static async createUserQueryService(
        input: CreateUserQueryInput,
    ) {
        const {
            requesterId,
            subject,
            category,
            message,
            imageUrls = [],
        } = input;

        this.validateObjectId(
            requesterId,
            "requester id",
        );

        this.validateMessageContent(
            message,
            imageUrls,
        );

        const requesterObjectId =
            new Types.ObjectId(
                requesterId,
            );

        const session =
            await mongoose.startSession();

        try {
            let result;

            await session.withTransaction(
                async () => {

                    const requester =
                        await User.findById(
                            requesterObjectId,
                        )
                            .select(
                                "_id role",
                            )
                            .session(
                                session,
                            );

                    if (!requester) {
                        throw new Error(
                            "Requester not found",
                        );
                    }

                    /*
                     * Never accept requesterType
                     * from frontend.
                     *
                     * Determine it from actual
                     * authenticated user's role.
                     */
                    const requesterType =
                        this.resolveRequesterType(
                            requester.role,
                        );

                    const queryObjectId =
                        new Types.ObjectId();

                    const now =
                        new Date();

                    const queryReference =
                        this.generateQueryReference(
                            queryObjectId,
                        );

                    const [queryDocument] =
                        await UserQuery.create(
                            [
                                {
                                    _id:
                                        queryObjectId,

                                    requesterId:
                                        requesterObjectId,

                                    requesterType,

                                    queryReference,

                                    subject,

                                    category,

                                    priority:
                                        "NORMAL",

                                    status:
                                        "PENDING",

                                    ...(message?.trim() && {
                                        latestMessage:
                                            message.trim(),
                                    }),

                                    ...(
                                        !message?.trim() &&
                                        imageUrls.length > 0 && {
                                            latestMessage:
                                                "Image sent",
                                        }
                                    ),

                                    latestMessageAt:
                                        now,

                                    lastAction:
                                        "QUERY_CREATED",

                                    lastActionAt:
                                        now,

                                    lastActionBy:
                                        requesterObjectId,

                                    requesterUnreadCount:
                                        0,

                                    adminUnreadCount:
                                        1,

                                    isDeleted:
                                        false,
                                },
                            ],
                            {
                                session,
                            },
                        );

                    if (!queryDocument) {
                        throw new Error(
                            "Failed to create query",
                        );
                    }

                    const [messageDocument] =
                        await UserQueryMessage.create(
                            [
                                {
                                    queryId:
                                        queryDocument._id,

                                    senderId:
                                        requesterObjectId,

                                    senderType:
                                        requesterType,

                                    ...(message?.trim() && {
                                        message:
                                            message.trim(),
                                    }),

                                    imageUrls,
                                },
                            ],
                            {
                                session,
                            },
                        );

                    if (!messageDocument) {
                        throw new Error(
                            "Failed to create query message",
                        );
                    }

                    await this.createActivity({
                        queryId:
                            queryDocument._id,

                        performedBy:
                            requesterObjectId,

                        type:
                            "QUERY_CREATED",

                        newValue: {
                            status:
                                "PENDING",

                            category,

                            priority:
                                "NORMAL",

                            requesterType,
                        },

                        session,
                    });

                    result = {
                        query:
                            queryDocument,

                        message:
                            messageDocument,
                    };
                },
            );

            return result;

        } finally {
            await session.endSession();
        }
    }


    // ========================================
    // GET MY QUERIES
    // USER + COORDINATOR
    // ========================================

    static async getMyQueries(
        params: {
            requesterId: string;
            status?: UserQueryStatus;
            category?: UserQueryCategory;
            limit?: number;
            page?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
        },
    ) {
        const {
            requesterId,
            status,
            category,
            limit = 20,
            page = 1,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = params;

        this.validateObjectId(
            requesterId,
            "requester id",
        );

        const requesterObjectId =
            new Types.ObjectId(
                requesterId,
            );

        const skip =
            (page - 1) * limit;

        const filter: any = {
            requesterId:
                requesterObjectId,

            isDeleted:
                false,
        };

        if (status) {
            filter.status =
                status;
        }

        if (category) {
            filter.category =
                category;
        }

        const allowedSortFields = [
            "createdAt",
            "updatedAt",
            "latestMessageAt",
            "lastActionAt",
        ];

        const safeSortBy =
            allowedSortFields.includes(
                sortBy,
            )
                ? sortBy
                : "createdAt";

        const sortCriteria: any = {
            [safeSortBy]:
                sortOrder === "asc"
                    ? 1
                    : -1,
        };

        if (
            safeSortBy !==
            "createdAt"
        ) {
            sortCriteria.createdAt =
                -1;
        }

        const [data, total] =
            await Promise.all([
                UserQuery.find(
                    filter,
                )
                    .populate(
                        "assignedAdminId",
                        "fullName profileImage role userReference",
                    )
                    .sort(
                        sortCriteria,
                    )
                    .skip(skip)
                    .limit(limit)
                    .lean(),

                UserQuery.countDocuments(
                    filter,
                ),
            ]);

        return {
            data,
            total,
            page,

            totalPages:
                Math.ceil(
                    total / limit,
                ),
        };
    }


    // ========================================
    // GET REQUESTER QUERY DETAIL
    // ========================================

    static async getUserQueryById(
        input: {
            queryId: string;
            requesterId: string;
        },
    ) {
        const {
            queryId,
            requesterId,
        } = input;

        this.validateObjectId(
            queryId,
            "query id",
        );

        this.validateObjectId(
            requesterId,
            "requester id",
        );

        const queryObjectId =
            new Types.ObjectId(
                queryId,
            );

        const requesterObjectId =
            new Types.ObjectId(
                requesterId,
            );

        const queryDocument =
            await UserQuery.findOne({
                _id:
                    queryObjectId,

                requesterId:
                    requesterObjectId,

                isDeleted:
                    false,
            })
                .populate(
                    "assignedAdminId",
                    "fullName profileImage role userReference",
                )
                .lean();

        if (!queryDocument) {
            throw new Error(
                "Query not found",
            );
        }

        const messages =
            await UserQueryMessage.find({
                queryId:
                    queryObjectId,
            })
                .populate(
                    "senderId",
                    "fullName profileImage role userReference",
                )
                .sort({
                    createdAt: 1,
                })
                .lean();

        return {
            query:
                queryDocument,

            messages,
        };
    }


    // ========================================
    // REQUESTER SEND MESSAGE
    // USER + COORDINATOR
    // ========================================

    static async sendUserQueryMessage(
        input: SendUserMessageInput,
    ) {
        const {
            queryId,
            requesterId,
            message,
            imageUrls = [],
        } = input;

        this.validateObjectId(
            queryId,
            "query id",
        );

        this.validateObjectId(
            requesterId,
            "requester id",
        );

        this.validateMessageContent(
            message,
            imageUrls,
        );

        const queryObjectId =
            new Types.ObjectId(
                queryId,
            );

        const requesterObjectId =
            new Types.ObjectId(
                requesterId,
            );

        const session =
            await mongoose.startSession();

        try {
            let result;

            await session.withTransaction(
                async () => {

                    const queryDocument =
                        await UserQuery.findOne({
                            _id:
                                queryObjectId,

                            requesterId:
                                requesterObjectId,

                            isDeleted:
                                false,
                        }).session(
                            session,
                        );

                    if (!queryDocument) {
                        throw new Error(
                            "Query not found",
                        );
                    }

                    if (
                        queryDocument.status ===
                        "RESOLVED"
                    ) {
                        throw new Error(
                            "Resolved query cannot receive new messages",
                        );
                    }

                    if (
                        queryDocument.status ===
                        "REJECTED"
                    ) {
                        throw new Error(
                            "Rejected query cannot receive new messages",
                        );
                    }

                    const now =
                        new Date();

                    const [messageDocument] =
                        await UserQueryMessage.create(
                            [
                                {
                                    queryId:
                                        queryDocument._id,

                                    senderId:
                                        requesterObjectId,

                                    /*
                                     * Already stored when query
                                     * was originally created.
                                     */
                                    senderType:
                                        queryDocument
                                            .requesterType,

                                    ...(message?.trim() && {
                                        message:
                                            message.trim(),
                                    }),

                                    imageUrls,
                                },
                            ],
                            {
                                session,
                            },
                        );

                    if (!messageDocument) {
                        throw new Error(
                            "Failed to send message",
                        );
                    }

                    if (message?.trim()) {
                        queryDocument.latestMessage =
                            message.trim();
                    } else if (
                        imageUrls.length >
                        0
                    ) {
                        queryDocument.latestMessage =
                            "Image sent";
                    }

                    queryDocument.latestMessageAt =
                        now;

                    queryDocument.lastAction =
                        "REQUESTER_REPLIED";

                    queryDocument.lastActionAt =
                        now;

                    queryDocument.lastActionBy =
                        requesterObjectId;

                    queryDocument.adminUnreadCount =
                        (
                            queryDocument
                                .adminUnreadCount ??
                            0
                        ) + 1;

                    await queryDocument.save({
                        session,
                    });

                    await this.createActivity({
                        queryId:
                            queryDocument._id,

                        performedBy:
                            requesterObjectId,

                        type:
                            "REQUESTER_REPLIED",

                        session,
                    });

                    result =
                        messageDocument;
                },
            );

            return result;

        } finally {
            await session.endSession();
        }
    }


    // ========================================
    // MARK QUERY AS READ
    // REQUESTER OR ADMIN
    // ========================================

    static async markUserQueryAsRead(
        input: MarkQueryAsReadInput,
    ) {
        const {
            queryId,
            requesterId,
        } = input;

        this.validateObjectId(
            queryId,
            "query id",
        );

        this.validateObjectId(
            requesterId,
            "user id",
        );

        const queryObjectId =
            new Types.ObjectId(
                queryId,
            );

        const actorObjectId =
            new Types.ObjectId(
                requesterId,
            );

        const queryDocument =
            await UserQuery.findOne({
                _id:
                    queryObjectId,

                isDeleted:
                    false,
            });

        if (!queryDocument) {
            throw new Error(
                "Query not found",
            );
        }

        /*
         * USER / COORDINATOR who owns query
         */
        if (
            queryDocument
                .requesterId
                .equals(
                    actorObjectId,
                )
        ) {
            queryDocument
                .requesterUnreadCount =
                0;

            await queryDocument.save();

            return {
                requesterUnreadCount:
                    0,

                adminUnreadCount:
                    queryDocument
                        .adminUnreadCount,
            };
        }

        /*
         * Otherwise caller must be ADMIN.
         */
        await this.ensureAdmin(
            actorObjectId,
        );

        queryDocument.adminUnreadCount =
            0;

        await queryDocument.save();

        return {
            requesterUnreadCount:
                queryDocument
                    .requesterUnreadCount,

            adminUnreadCount:
                0,
        };
    }


    // ========================================
    // ADMIN GET ALL QUERIES
    // ========================================

    static async getAllUserQueries(
        params: {
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
        },
    ) {
        const {
            searchTerm,
            status,
            category,
            priority,
            requesterType,
            assignedAdminId,
            requesterId,
            isDeleted = false,
            limit = 40,
            page = 1,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = params;

        const filter: any = {};

        if (status) {
            filter.status =
                status;
        }

        if (category) {
            filter.category =
                category;
        }

        if (priority) {
            filter.priority =
                priority;
        }

        if (requesterType) {
            filter.requesterType =
                requesterType;
        }

        if (
            typeof isDeleted ===
            "boolean"
        ) {
            filter.isDeleted =
                isDeleted;
        }

        if (assignedAdminId) {
            this.validateObjectId(
                assignedAdminId,
                "assigned admin id",
            );

            filter.assignedAdminId =
                new Types.ObjectId(
                    assignedAdminId,
                );
        }

        if (requesterId) {
            this.validateObjectId(
                requesterId,
                "requester id",
            );

            filter.requesterId =
                new Types.ObjectId(
                    requesterId,
                );
        }


        // ====================================
        // SEARCH
        // ====================================

        if (searchTerm?.trim()) {
            const term =
                searchTerm.trim();

            const regex =
                new RegExp(
                    term,
                    "i",
                );

            const matchingUsers =
                await User.find({
                    $or: [
                        {
                            fullName:
                                regex,
                        },
                        {
                            userReference:
                                regex,
                        },
                    ],
                })
                    .select("_id")
                    .lean();

            const matchingRequesterIds =
                matchingUsers.map(
                    (user) =>
                        user._id,
                );

            filter.$or = [
                {
                    queryReference:
                        regex,
                },

                {
                    subject:
                        regex,
                },

                {
                    latestMessage:
                        regex,
                },

                {
                    requesterId: {
                        $in:
                            matchingRequesterIds,
                    },
                },
            ];
        }


        // ====================================
        // SORTING
        // ====================================

        const allowedSortFields = [
            "createdAt",
            "updatedAt",
            "latestMessageAt",
            "lastActionAt",
            "priority",
        ];

        const safeSortBy =
            allowedSortFields.includes(
                sortBy,
            )
                ? sortBy
                : "createdAt";

        const sortCriteria: any = {
            [safeSortBy]:
                sortOrder === "asc"
                    ? 1
                    : -1,
        };

        if (
            safeSortBy !==
            "createdAt"
        ) {
            sortCriteria.createdAt =
                -1;
        }

        const skip =
            (page - 1) *
            limit;

        const [data, total] =
            await Promise.all([
                UserQuery.find(
                    filter,
                )
                    .populate(
                        "requesterId",
                        "fullName profileImage role userReference email",
                    )
                    .populate(
                        "assignedAdminId",
                        "fullName profileImage role userReference",
                    )
                    .populate(
                        "lastActionBy",
                        "fullName role userReference",
                    )
                    .sort(
                        sortCriteria,
                    )
                    .skip(skip)
                    .limit(limit)
                    .lean(),

                UserQuery.countDocuments(
                    filter,
                ),
            ]);

        return {
            data,
            total,
            page,

            totalPages:
                Math.ceil(
                    total / limit,
                ),
        };
    }


    // ========================================
    // ADMIN GET QUERY DETAIL
    // ========================================

    static async getAdminUserQueryById(
        input: {
            queryId: string;
            adminId: string;
        },
    ) {
        const {
            queryId,
            adminId,
        } = input;

        this.validateObjectId(
            queryId,
            "query id",
        );

        this.validateObjectId(
            adminId,
            "admin id",
        );

        const queryObjectId =
            new Types.ObjectId(
                queryId,
            );

        const adminObjectId =
            new Types.ObjectId(
                adminId,
            );

        await this.ensureAdmin(
            adminObjectId,
        );

        const queryDocument =
            await UserQuery.findById(
                queryObjectId,
            )
                .populate(
                    "requesterId",
                    "fullName profileImage role userReference email",
                )
                .populate(
                    "assignedAdminId",
                    "fullName profileImage role userReference",
                )
                .populate(
                    "resolvedBy",
                    "fullName role userReference",
                )
                .populate(
                    "rejectedBy",
                    "fullName role userReference",
                )
                .populate(
                    "deletedBy",
                    "fullName role userReference",
                )
                .lean();

        if (!queryDocument) {
            throw new Error(
                "Query not found",
            );
        }

        const [
            messages,
            activities,
        ] =
            await Promise.all([
                UserQueryMessage.find({
                    queryId:
                        queryObjectId,
                })
                    .populate(
                        "senderId",
                        "fullName profileImage role userReference",
                    )
                    .sort({
                        createdAt: 1,
                    })
                    .lean(),

                UserQueryActivity.find({
                    queryId:
                        queryObjectId,
                })
                    .populate(
                        "performedBy",
                        "fullName profileImage role userReference",
                    )
                    .sort({
                        createdAt: -1,
                    })
                    .lean(),
            ]);

        return {
            query:
                queryDocument,

            messages,

            activities,
        };
    }


    // ========================================
    // ADMIN REPLY
    // ========================================

    static async sendAdminQueryReply(
        input: AdminReplyInput,
    ) {
        const {
            queryId,
            adminId,
            message,
            imageUrls = [],
        } = input;

        this.validateObjectId(
            queryId,
            "query id",
        );

        this.validateObjectId(
            adminId,
            "admin id",
        );

        this.validateMessageContent(
            message,
            imageUrls,
        );

        const queryObjectId =
            new Types.ObjectId(
                queryId,
            );

        const adminObjectId =
            new Types.ObjectId(
                adminId,
            );

        const session =
            await mongoose.startSession();

        try {
            let result;

            await session.withTransaction(
                async () => {

                    await this.ensureAdmin(
                        adminObjectId,
                        session,
                    );

                    const queryDocument =
                        await UserQuery.findOne({
                            _id:
                                queryObjectId,

                            isDeleted:
                                false,
                        }).session(
                            session,
                        );

                    if (!queryDocument) {
                        throw new Error(
                            "Query not found",
                        );
                    }

                    if (
                        queryDocument.status ===
                            "RESOLVED" ||
                        queryDocument.status ===
                            "REJECTED"
                    ) {
                        throw new Error(
                            "Closed query cannot receive new replies",
                        );
                    }

                    const now =
                        new Date();


                    // PENDING → ONGOING automatically
                    if (
                        queryDocument.status ===
                        "PENDING"
                    ) {
                        const oldStatus =
                            queryDocument.status;

                        queryDocument.status =
                            "ONGOING";

                        await this.createActivity({
                            queryId:
                                queryDocument._id,

                            performedBy:
                                adminObjectId,

                            type:
                                "STATUS_CHANGED",

                            oldValue: {
                                status:
                                    oldStatus,
                            },

                            newValue: {
                                status:
                                    "ONGOING",
                            },

                            note:
                                "Query moved to ongoing after admin reply",

                            session,
                        });
                    }


                    const [messageDocument] =
                        await UserQueryMessage.create(
                            [
                                {
                                    queryId:
                                        queryDocument._id,

                                    senderId:
                                        adminObjectId,

                                    senderType:
                                        "ADMIN",

                                    ...(message?.trim() && {
                                        message:
                                            message.trim(),
                                    }),

                                    imageUrls,
                                },
                            ],
                            {
                                session,
                            },
                        );

                    if (!messageDocument) {
                        throw new Error(
                            "Failed to send reply",
                        );
                    }


                    if (message?.trim()) {
                        queryDocument.latestMessage =
                            message.trim();
                    } else if (
                        imageUrls.length >
                        0
                    ) {
                        queryDocument.latestMessage =
                            "Image sent";
                    }

                    queryDocument.latestMessageAt =
                        now;

                    queryDocument.lastAction =
                        "ADMIN_REPLIED";

                    queryDocument.lastActionAt =
                        now;

                    queryDocument.lastActionBy =
                        adminObjectId;


                    /*
                     * Admin read all previous
                     * requester messages by replying.
                     */
                    queryDocument.adminUnreadCount =
                        0;

                    /*
                     * Requester has a new
                     * admin response.
                     */
                    queryDocument.requesterUnreadCount =
                        (
                            queryDocument
                                .requesterUnreadCount ??
                            0
                        ) + 1;


                    await queryDocument.save({
                        session,
                    });


                    await this.createActivity({
                        queryId:
                            queryDocument._id,

                        performedBy:
                            adminObjectId,

                        type:
                            "ADMIN_REPLIED",

                        session,
                    });


                    result =
                        messageDocument;
                },
            );

            return result;

        } finally {
            await session.endSession();
        }
    }


    // ========================================
    // UPDATE STATUS
    // ========================================

    static async updateUserQueryStatus(
        input: UpdateStatusInput,
    ) {
        const {
            queryId,
            adminId,
            status,
            reason,
        } = input;

        this.validateObjectId(
            queryId,
            "query id",
        );

        this.validateObjectId(
            adminId,
            "admin id",
        );

        const queryObjectId =
            new Types.ObjectId(
                queryId,
            );

        const adminObjectId =
            new Types.ObjectId(
                adminId,
            );


        const allowedTransitions:
            Record<
                UserQueryStatus,
                UserQueryStatus[]
            > = {

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


        const session =
            await mongoose.startSession();

        try {
            let result;

            await session.withTransaction(
                async () => {

                    await this.ensureAdmin(
                        adminObjectId,
                        session,
                    );

                    const queryDocument =
                        await UserQuery.findOne({
                            _id:
                                queryObjectId,

                            isDeleted:
                                false,
                        }).session(
                            session,
                        );

                    if (!queryDocument) {
                        throw new Error(
                            "Query not found",
                        );
                    }

                    const oldStatus =
                        queryDocument.status;

                    if (
                        oldStatus ===
                        status
                    ) {
                        throw new Error(
                            `Query is already ${status.toLowerCase()}`,
                        );
                    }

                    if (
                        !allowedTransitions[
                            oldStatus
                        ].includes(
                            status,
                        )
                    ) {
                        throw new Error(
                            `Cannot change query status from ${oldStatus} to ${status}`,
                        );
                    }

                    if (
                        status ===
                            "REJECTED" &&
                        !reason?.trim()
                    ) {
                        throw new Error(
                            "Rejection reason is required",
                        );
                    }

                    const now =
                        new Date();

                    queryDocument.status =
                        status;


                    // RESOLVE
                    if (
                        status ===
                        "RESOLVED"
                    ) {
                        queryDocument.resolvedAt =
                            now;

                        queryDocument.resolvedBy =
                            adminObjectId;
                    }


                    // REOPEN
                    if (
                        oldStatus ===
                            "RESOLVED" &&
                        status ===
                            "ONGOING"
                    ) {
                        delete queryDocument.resolvedAt;

                        delete queryDocument.resolvedBy;
                    }


                    // REJECT
                    if (
                        status ===
                        "REJECTED"
                    ) {
                        queryDocument.rejectedAt =
                            now;

                        queryDocument.rejectedBy =
                            adminObjectId;

                        queryDocument.rejectionReason =
                            reason!.trim();
                    }


                    queryDocument.lastAction =
                        "STATUS_CHANGED";

                    queryDocument.lastActionAt =
                        now;

                    queryDocument.lastActionBy =
                        adminObjectId;


                    await queryDocument.save({
                        session,
                    });


                    await this.createActivity({
                        queryId:
                            queryDocument._id,

                        performedBy:
                            adminObjectId,

                        type:
                            "STATUS_CHANGED",

                        oldValue: {
                            status:
                                oldStatus,
                        },

                        newValue: {
                            status,
                        },

                        ...(reason?.trim() && {
                            note:
                                reason.trim(),
                        }),

                        session,
                    });


                    result =
                        queryDocument;
                },
            );

            return result;

        } finally {
            await session.endSession();
        }
    }


    // ========================================
    // UPDATE PRIORITY
    // ========================================

    static async updateUserQueryPriority(
        input: UpdatePriorityInput,
    ) {
        const {
            queryId,
            adminId,
            priority,
            reason,
        } = input;

        this.validateObjectId(
            queryId,
            "query id",
        );

        this.validateObjectId(
            adminId,
            "admin id",
        );

        const queryObjectId =
            new Types.ObjectId(
                queryId,
            );

        const adminObjectId =
            new Types.ObjectId(
                adminId,
            );

        const session =
            await mongoose.startSession();

        try {
            let result;

            await session.withTransaction(
                async () => {

                    await this.ensureAdmin(
                        adminObjectId,
                        session,
                    );

                    const queryDocument =
                        await UserQuery.findOne({
                            _id:
                                queryObjectId,

                            isDeleted:
                                false,
                        }).session(
                            session,
                        );

                    if (!queryDocument) {
                        throw new Error(
                            "Query not found",
                        );
                    }

                    const oldPriority =
                        queryDocument.priority;

                    if (
                        oldPriority ===
                        priority
                    ) {
                        throw new Error(
                            `Query priority is already ${priority.toLowerCase()}`,
                        );
                    }

                    const now =
                        new Date();

                    queryDocument.priority =
                        priority;

                    queryDocument.lastAction =
                        "PRIORITY_CHANGED";

                    queryDocument.lastActionAt =
                        now;

                    queryDocument.lastActionBy =
                        adminObjectId;

                    await queryDocument.save({
                        session,
                    });


                    await this.createActivity({
                        queryId:
                            queryDocument._id,

                        performedBy:
                            adminObjectId,

                        type:
                            "PRIORITY_CHANGED",

                        oldValue: {
                            priority:
                                oldPriority,
                        },

                        newValue: {
                            priority,
                        },

                        ...(reason?.trim() && {
                            note:
                                reason.trim(),
                        }),

                        session,
                    });

                    result =
                        queryDocument;
                },
            );

            return result;

        } finally {
            await session.endSession();
        }
    }


    // ========================================
    // UPDATE CATEGORY
    // ========================================

    static async updateUserQueryCategory(
        input: UpdateCategoryInput,
    ) {
        const {
            queryId,
            adminId,
            category,
            reason,
        } = input;

        this.validateObjectId(
            queryId,
            "query id",
        );

        this.validateObjectId(
            adminId,
            "admin id",
        );

        const queryObjectId =
            new Types.ObjectId(
                queryId,
            );

        const adminObjectId =
            new Types.ObjectId(
                adminId,
            );

        const session =
            await mongoose.startSession();

        try {
            let result;

            await session.withTransaction(
                async () => {

                    await this.ensureAdmin(
                        adminObjectId,
                        session,
                    );

                    const queryDocument =
                        await UserQuery.findOne({
                            _id:
                                queryObjectId,

                            isDeleted:
                                false,
                        }).session(
                            session,
                        );

                    if (!queryDocument) {
                        throw new Error(
                            "Query not found",
                        );
                    }

                    const oldCategory =
                        queryDocument.category;

                    if (
                        oldCategory ===
                        category
                    ) {
                        throw new Error(
                            `Query category is already ${category.toLowerCase()}`,
                        );
                    }

                    const now =
                        new Date();

                    queryDocument.category =
                        category;

                    queryDocument.lastAction =
                        "CATEGORY_CHANGED";

                    queryDocument.lastActionAt =
                        now;

                    queryDocument.lastActionBy =
                        adminObjectId;


                    await queryDocument.save({
                        session,
                    });


                    await this.createActivity({
                        queryId:
                            queryDocument._id,

                        performedBy:
                            adminObjectId,

                        type:
                            "CATEGORY_CHANGED",

                        oldValue: {
                            category:
                                oldCategory,
                        },

                        newValue: {
                            category,
                        },

                        ...(reason?.trim() && {
                            note:
                                reason.trim(),
                        }),

                        session,
                    });


                    result =
                        queryDocument;
                },
            );

            return result;

        } finally {
            await session.endSession();
        }
    }


    // ========================================
    // ASSIGN QUERY
    // ========================================

    static async assignUserQuery(
        input: AssignQueryInput,
    ) {
        const {
            queryId,
            adminId,
            performedBy,
        } = input;

        this.validateObjectId(
            queryId,
            "query id",
        );

        this.validateObjectId(
            adminId,
            "admin id",
        );

        this.validateObjectId(
            performedBy,
            "performed by id",
        );

        const queryObjectId =
            new Types.ObjectId(
                queryId,
            );

        const adminObjectId =
            new Types.ObjectId(
                adminId,
            );

        const performedByObjectId =
            new Types.ObjectId(
                performedBy,
            );

        const session =
            await mongoose.startSession();

        try {
            let result;

            await session.withTransaction(
                async () => {

                    await this.ensureAdmin(
                        performedByObjectId,
                        session,
                    );

                    await this.ensureAdmin(
                        adminObjectId,
                        session,
                    );


                    const queryDocument =
                        await UserQuery.findOne({
                            _id:
                                queryObjectId,

                            isDeleted:
                                false,
                        }).session(
                            session,
                        );

                    if (!queryDocument) {
                        throw new Error(
                            "Query not found",
                        );
                    }


                    const oldAdminId =
                        queryDocument
                            .assignedAdminId;


                    if (
                        oldAdminId?.equals(
                            adminObjectId,
                        )
                    ) {
                        throw new Error(
                            "Query is already assigned to this admin",
                        );
                    }


                    const now =
                        new Date();


                    queryDocument.assignedAdminId =
                        adminObjectId;

                    queryDocument.lastAction =
                        "ASSIGNED";

                    queryDocument.lastActionAt =
                        now;

                    queryDocument.lastActionBy =
                        performedByObjectId;


                    await queryDocument.save({
                        session,
                    });


                    await this.createActivity({
                        queryId:
                            queryDocument._id,

                        performedBy:
                            performedByObjectId,

                        type:
                            "ASSIGNED",

                        oldValue: {
                            assignedAdminId:
                                oldAdminId ??
                                null,
                        },

                        newValue: {
                            assignedAdminId:
                                adminObjectId,
                        },

                        session,
                    });


                    result =
                        queryDocument;
                },
            );

            return result;

        } finally {
            await session.endSession();
        }
    }


    // ========================================
    // SOFT DELETE QUERY
    // ========================================

    static async deleteUserQuery(
        input: DeleteQueryInput,
    ) {
        const {
            queryId,
            adminId,
            reason,
        } = input;

        this.validateObjectId(
            queryId,
            "query id",
        );

        this.validateObjectId(
            adminId,
            "admin id",
        );

        if (!reason?.trim()) {
            throw new Error(
                "Deletion reason is required",
            );
        }

        const queryObjectId =
            new Types.ObjectId(
                queryId,
            );

        const adminObjectId =
            new Types.ObjectId(
                adminId,
            );

        const session =
            await mongoose.startSession();

        try {
            let result;

            await session.withTransaction(
                async () => {

                    await this.ensureAdmin(
                        adminObjectId,
                        session,
                    );


                    const queryDocument =
                        await UserQuery.findById(
                            queryObjectId,
                        ).session(
                            session,
                        );


                    if (!queryDocument) {
                        throw new Error(
                            "Query not found",
                        );
                    }


                    if (
                        queryDocument.isDeleted
                    ) {
                        throw new Error(
                            "Query is already deleted",
                        );
                    }


                    const now =
                        new Date();


                    queryDocument.isDeleted =
                        true;

                    queryDocument.deletedAt =
                        now;

                    queryDocument.deletedBy =
                        adminObjectId;

                    queryDocument.deletionReason =
                        reason.trim();


                    await queryDocument.save({
                        session,
                    });


                    await this.createActivity({
                        queryId:
                            queryDocument._id,

                        performedBy:
                            adminObjectId,

                        type:
                            "QUERY_DELETED",

                        newValue: {
                            isDeleted:
                                true,
                        },

                        note:
                            reason.trim(),

                        session,
                    });


                    result =
                        queryDocument;
                },
            );

            return result;

        } finally {
            await session.endSession();
        }
    }
}