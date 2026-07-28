import type {
    Request,
    Response,
} from "express";

import {
    UserQueryService,
} from "../services/userQuery.services.js";

import type {
    UserQueryStatus,
    UserQueryCategory,
    UserQueryPriority,
    UserQueryRequesterType,
} from "../models/userQuery.model.js";


// =========================
// CREATE USER QUERY
// USER + COORDINATOR
// =========================

export const createUserQuery = async (
    req: Request,
    res: Response,
) => {
    try {
        const requesterId =
            req.user?.userId;

        if (!requesterId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const {
            subject,
            category,
            message,
            imageUrls,
        } = req.body;

        const result =
            await UserQueryService
                .createUserQueryService({
                    requesterId:
                        requesterId.toString(),

                    subject,

                    category,

                    message,

                    imageUrls,
                });

        return res.status(201).json({
            success: true,
            message:
                "Query created successfully",
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to create query",
        });
    }
};


// =========================
// GET MY QUERIES
// USER + COORDINATOR
// =========================

export const getMyQueries = async (
    req: Request,
    res: Response,
) => {
    try {
        const requesterId =
            req.user?.userId;

        if (!requesterId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const {
            status,
            category,
            limit,
            page,
            sortBy,
            sortOrder,
        } = req.query;

        const result =
            await UserQueryService
                .getMyQueries({
                    requesterId:
                        requesterId.toString(),

                    ...(status && {
                        status:
                            status as UserQueryStatus,
                    }),

                    ...(category && {
                        category:
                            category as UserQueryCategory,
                    }),

                    limit:
                        Number(limit) || 20,

                    page:
                        Number(page) || 1,

                    sortBy:
                        (sortBy as string) ||
                        "createdAt",

                    sortOrder:
                        (sortOrder as
                            | "asc"
                            | "desc") ||
                        "desc",
                });

        return res.status(200).json({
            success: true,

            data:
                result.data,

            total:
                result.total,

            currentPage:
                result.page,

            totalPages:
                result.totalPages,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to fetch queries",
        });
    }
};


// =========================
// GET REQUESTER QUERY BY ID
// USER + COORDINATOR
// =========================

export const getUserQueryById = async (
    req: Request,
    res: Response,
) => {
    try {
        const requesterId =
            req.user?.userId;

        if (!requesterId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const {
            queryId,
        } = req.params;

        if (
            !queryId ||
            Array.isArray(queryId)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid query ID is required",
            });
        }

        const result =
            await UserQueryService
                .getUserQueryById({
                    queryId,

                    requesterId:
                        requesterId.toString(),
                });

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to fetch query",
        });
    }
};


// =========================
// REQUESTER SEND MESSAGE
// USER + COORDINATOR
// =========================

export const sendUserQueryMessage = async (
    req: Request,
    res: Response,
) => {
    try {
        const requesterId =
            req.user?.userId;

        if (!requesterId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const {
            queryId,
        } = req.params;

        if (
            !queryId ||
            Array.isArray(queryId)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid query ID is required",
            });
        }

        const {
            message,
            imageUrls,
        } = req.body;

        const result =
            await UserQueryService
                .sendUserQueryMessage({
                    queryId,

                    requesterId:
                        requesterId.toString(),

                    message,

                    imageUrls,
                });

        return res.status(201).json({
            success: true,
            message:
                "Message sent successfully",
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to send message",
        });
    }
};


// =========================
// MARK REQUESTER QUERY AS READ
// USER + COORDINATOR
// =========================

export const markUserQueryAsRead = async (
    req: Request,
    res: Response,
) => {
    try {
        const requesterId =
            req.user?.userId;

        if (!requesterId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const {
            queryId,
        } = req.params;

        if (
            !queryId ||
            Array.isArray(queryId)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid query ID is required",
            });
        }

        const result =
            await UserQueryService
                .markUserQueryAsRead({
                    queryId,

                    requesterId:
                        requesterId.toString(),
                });

        return res.status(200).json({
            success: true,
            message:
                "Query marked as read",
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to mark query as read",
        });
    }
};


// =========================
// ADMIN GET ALL QUERIES
// =========================

export const getAllUserQueries = async (
    req: Request,
    res: Response,
) => {
    try {
        const {
            searchTerm,
            status,
            category,
            priority,
            requesterType,
            assignedAdminId,
            requesterId,
            isDeleted,
            limit,
            page,
            sortBy,
            sortOrder,
        } = req.query;

        const result =
            await UserQueryService
                .getAllUserQueries({
                    ...(searchTerm && {
                        searchTerm:
                            searchTerm as string,
                    }),

                    ...(status && {
                        status:
                            status as UserQueryStatus,
                    }),

                    ...(category && {
                        category:
                            category as UserQueryCategory,
                    }),

                    ...(priority && {
                        priority:
                            priority as UserQueryPriority,
                    }),

                    ...(requesterType && {
                        requesterType:
                            requesterType as UserQueryRequesterType,
                    }),

                    ...(assignedAdminId && {
                        assignedAdminId:
                            assignedAdminId as string,
                    }),

                    ...(requesterId && {
                        requesterId:
                            requesterId as string,
                    }),

                    ...(isDeleted !== undefined && {
                        isDeleted:
                            isDeleted === "true",
                    }),

                    limit:
                        Number(limit) || 40,

                    page:
                        Number(page) || 1,

                    sortBy:
                        (sortBy as string) ||
                        "createdAt",

                    sortOrder:
                        (sortOrder as
                            | "asc"
                            | "desc") ||
                        "desc",
                });

        return res.status(200).json({
            success: true,

            data:
                result.data,

            total:
                result.total,

            currentPage:
                result.page,

            totalPages:
                result.totalPages,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to fetch user queries",
        });
    }
};


// =========================
// ADMIN GET QUERY BY ID
// =========================

export const getAdminUserQueryById = async (
    req: Request,
    res: Response,
) => {
    try {
        const adminId =
            req.user?.userId;

        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const {
            queryId,
        } = req.params;

        if (
            !queryId ||
            Array.isArray(queryId)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid query ID is required",
            });
        }

        const result =
            await UserQueryService
                .getAdminUserQueryById({
                    queryId,

                    adminId:
                        adminId.toString(),
                });

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to fetch query",
        });
    }
};


// =========================
// ADMIN REPLY
// =========================

export const sendAdminQueryReply = async (
    req: Request,
    res: Response,
) => {
    try {
        const adminId =
            req.user?.userId;

        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const {
            queryId,
        } = req.params;

        if (
            !queryId ||
            Array.isArray(queryId)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid query ID is required",
            });
        }

        const {
            message,
            imageUrls,
        } = req.body;

        const result =
            await UserQueryService
                .sendAdminQueryReply({
                    queryId,

                    adminId:
                        adminId.toString(),

                    message,

                    imageUrls,
                });

        return res.status(201).json({
            success: true,
            message:
                "Reply sent successfully",
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to send reply",
        });
    }
};


// =========================
// UPDATE STATUS
// =========================

export const updateUserQueryStatus = async (
    req: Request,
    res: Response,
) => {
    try {
        const adminId =
            req.user?.userId;

        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const {
            queryId,
        } = req.params;

        if (
            !queryId ||
            Array.isArray(queryId)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid query ID is required",
            });
        }

        const {
            status,
            reason,
        } = req.body;

        const result =
            await UserQueryService
                .updateUserQueryStatus({
                    queryId,

                    adminId:
                        adminId.toString(),

                    status:
                        status as UserQueryStatus,

                    reason,
                });

        return res.status(200).json({
            success: true,
            message:
                "Query status updated successfully",
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to update query status",
        });
    }
};


// =========================
// UPDATE PRIORITY
// =========================

export const updateUserQueryPriority = async (
    req: Request,
    res: Response,
) => {
    try {
        const adminId =
            req.user?.userId;

        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const {
            queryId,
        } = req.params;

        if (
            !queryId ||
            Array.isArray(queryId)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid query ID is required",
            });
        }

        const {
            priority,
            reason,
        } = req.body;

        const result =
            await UserQueryService
                .updateUserQueryPriority({
                    queryId,

                    adminId:
                        adminId.toString(),

                    priority:
                        priority as UserQueryPriority,

                    reason,
                });

        return res.status(200).json({
            success: true,
            message:
                "Query priority updated successfully",
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to update query priority",
        });
    }
};


// =========================
// UPDATE CATEGORY
// =========================

export const updateUserQueryCategory = async (
    req: Request,
    res: Response,
) => {
    try {
        const adminId =
            req.user?.userId;

        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const {
            queryId,
        } = req.params;

        if (
            !queryId ||
            Array.isArray(queryId)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid query ID is required",
            });
        }

        const {
            category,
            reason,
        } = req.body;

        const result =
            await UserQueryService
                .updateUserQueryCategory({
                    queryId,

                    adminId:
                        adminId.toString(),

                    category:
                        category as UserQueryCategory,

                    reason,
                });

        return res.status(200).json({
            success: true,
            message:
                "Query category updated successfully",
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to update query category",
        });
    }
};


// =========================
// ASSIGN QUERY
// =========================

export const assignUserQuery = async (
    req: Request,
    res: Response,
) => {
    try {
        const performedBy =
            req.user?.userId;

        if (!performedBy) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const {
            queryId,
        } = req.params;

        if (
            !queryId ||
            Array.isArray(queryId)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid query ID is required",
            });
        }

        const {
            adminId,
        } = req.body;

        const result =
            await UserQueryService
                .assignUserQuery({
                    queryId,

                    adminId,

                    performedBy:
                        performedBy.toString(),
                });

        return res.status(200).json({
            success: true,
            message:
                "Query assigned successfully",
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to assign query",
        });
    }
};


// =========================
// DELETE QUERY
// =========================

export const deleteUserQuery = async (
    req: Request,
    res: Response,
) => {
    try {
        const adminId =
            req.user?.userId;

        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const {
            queryId,
        } = req.params;

        if (
            !queryId ||
            Array.isArray(queryId)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid query ID is required",
            });
        }

        const {
            reason,
        } = req.body;

        const result =
            await UserQueryService
                .deleteUserQuery({
                    queryId,

                    adminId:
                        adminId.toString(),

                    reason,
                });

        return res.status(200).json({
            success: true,
            message:
                "Query deleted successfully",
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to delete query",
        });
    }
};