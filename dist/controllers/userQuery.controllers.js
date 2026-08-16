import { UserQueryService } from "../services/userQuery.services.js";
const getErrorMessage = (error, fallback) => error instanceof Error ? error.message : fallback;
const getErrorStatus = (error) => {
    if (!(error instanceof Error)) {
        return 400;
    }
    if (error.message.includes("not found")) {
        return 404;
    }
    if (error.message.includes("not authorized") ||
        error.message.includes("Only customers and coordinators") ||
        error.message.includes("not an admin")) {
        return 403;
    }
    if (error.message.includes("already")) {
        return 409;
    }
    return 400;
};
const getUserId = (req) => req.user?.userId ? String(req.user.userId) : null;
const parsePositiveInteger = (value, fallback, max) => {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
        return fallback;
    }
    return max ? Math.min(parsed, max) : parsed;
};
export const createUserQuery = async (req, res) => {
    try {
        const requesterId = getUserId(req);
        if (!requesterId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const input = {
            requesterId,
            subject: req.body.subject,
            category: req.body.category,
        };
        if (Object.prototype.hasOwnProperty.call(req.body, "message")) {
            input.message = req.body.message;
        }
        if (Object.prototype.hasOwnProperty.call(req.body, "imageUrls")) {
            input.imageUrls = req.body.imageUrls;
        }
        const result = await UserQueryService.createUserQueryService(input);
        return res.status(201).json({
            success: true,
            message: "Query created successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to create query"),
        });
    }
};
export const getMyQueries = async (req, res) => {
    try {
        const requesterId = getUserId(req);
        if (!requesterId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const params = {
            requesterId,
            limit: parsePositiveInteger(req.query.limit, 20, 100),
            page: parsePositiveInteger(req.query.page, 1),
            sortBy: typeof req.query.sortBy === "string" ? req.query.sortBy : "createdAt",
            sortOrder: req.query.sortOrder === "asc" ? "asc" : "desc",
        };
        if (typeof req.query.status === "string") {
            params.status = req.query.status;
        }
        if (typeof req.query.category === "string") {
            params.category = req.query.category;
        }
        const result = await UserQueryService.getMyQueries(params);
        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            currentPage: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch queries"),
        });
    }
};
export const getUserQueryById = async (req, res) => {
    try {
        const requesterId = getUserId(req);
        if (!requesterId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const result = await UserQueryService.getUserQueryById({
            queryId: req.params.queryId,
            requesterId,
        });
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch query"),
        });
    }
};
export const sendUserQueryMessage = async (req, res) => {
    try {
        const requesterId = getUserId(req);
        if (!requesterId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const input = {
            queryId: req.params.queryId,
            requesterId,
        };
        if (Object.prototype.hasOwnProperty.call(req.body, "message")) {
            input.message = req.body.message;
        }
        if (Object.prototype.hasOwnProperty.call(req.body, "imageUrls")) {
            input.imageUrls = req.body.imageUrls;
        }
        const result = await UserQueryService.sendUserQueryMessage(input);
        return res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to send message"),
        });
    }
};
export const markUserQueryAsRead = async (req, res) => {
    try {
        const actorId = getUserId(req);
        if (!actorId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const result = await UserQueryService.markUserQueryAsRead({
            queryId: req.params.queryId,
            actorId,
        });
        return res.status(200).json({
            success: true,
            message: "Query marked as read",
            data: result,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to mark query as read"),
        });
    }
};
export const getAllUserQueries = async (req, res) => {
    try {
        const params = {
            limit: parsePositiveInteger(req.query.limit, 40, 100),
            page: parsePositiveInteger(req.query.page, 1),
            sortBy: typeof req.query.sortBy === "string" ? req.query.sortBy : "createdAt",
            sortOrder: req.query.sortOrder === "asc" ? "asc" : "desc",
        };
        if (typeof req.query.searchTerm === "string") {
            params.searchTerm = req.query.searchTerm;
        }
        if (typeof req.query.status === "string") {
            params.status = req.query.status;
        }
        if (typeof req.query.category === "string") {
            params.category = req.query.category;
        }
        if (typeof req.query.priority === "string") {
            params.priority = req.query.priority;
        }
        if (typeof req.query.requesterType === "string") {
            params.requesterType = req.query.requesterType;
        }
        if (typeof req.query.assignedAdminId === "string") {
            params.assignedAdminId = req.query.assignedAdminId;
        }
        if (typeof req.query.requesterId === "string") {
            params.requesterId = req.query.requesterId;
        }
        if (req.query.isDeleted === "true") {
            params.isDeleted = true;
        }
        else if (req.query.isDeleted === "false") {
            params.isDeleted = false;
        }
        const result = await UserQueryService.getAllUserQueries(params);
        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            currentPage: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch user queries"),
        });
    }
};
export const getAdminUserQueryById = async (req, res) => {
    try {
        const adminId = getUserId(req);
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const result = await UserQueryService.getAdminUserQueryById({
            queryId: req.params.queryId,
            adminId,
        });
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch query"),
        });
    }
};
export const sendAdminQueryReply = async (req, res) => {
    try {
        const adminId = getUserId(req);
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const input = {
            queryId: req.params.queryId,
            adminId,
        };
        if (Object.prototype.hasOwnProperty.call(req.body, "message")) {
            input.message = req.body.message;
        }
        if (Object.prototype.hasOwnProperty.call(req.body, "imageUrls")) {
            input.imageUrls = req.body.imageUrls;
        }
        const result = await UserQueryService.sendAdminQueryReply(input);
        return res.status(201).json({
            success: true,
            message: "Reply sent successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to send reply"),
        });
    }
};
export const updateUserQueryStatus = async (req, res) => {
    try {
        const adminId = getUserId(req);
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const input = {
            queryId: req.params.queryId,
            adminId,
            status: req.body.status,
        };
        if (Object.prototype.hasOwnProperty.call(req.body, "reason")) {
            input.reason = req.body.reason;
        }
        const result = await UserQueryService.updateUserQueryStatus(input);
        return res.status(200).json({
            success: true,
            message: "Query status updated successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to update query status"),
        });
    }
};
export const updateUserQueryPriority = async (req, res) => {
    try {
        const adminId = getUserId(req);
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const input = {
            queryId: req.params.queryId,
            adminId,
            priority: req.body.priority,
        };
        if (Object.prototype.hasOwnProperty.call(req.body, "reason")) {
            input.reason = req.body.reason;
        }
        const result = await UserQueryService.updateUserQueryPriority(input);
        return res.status(200).json({
            success: true,
            message: "Query priority updated successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to update query priority"),
        });
    }
};
export const updateUserQueryCategory = async (req, res) => {
    try {
        const adminId = getUserId(req);
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const input = {
            queryId: req.params.queryId,
            adminId,
            category: req.body.category,
        };
        if (Object.prototype.hasOwnProperty.call(req.body, "reason")) {
            input.reason = req.body.reason;
        }
        const result = await UserQueryService.updateUserQueryCategory(input);
        return res.status(200).json({
            success: true,
            message: "Query category updated successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to update query category"),
        });
    }
};
export const assignUserQuery = async (req, res) => {
    try {
        const performedBy = getUserId(req);
        if (!performedBy) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const result = await UserQueryService.assignUserQuery({
            queryId: req.params.queryId,
            adminId: req.body.adminId,
            performedBy,
        });
        return res.status(200).json({
            success: true,
            message: "Query assigned successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to assign query"),
        });
    }
};
export const deleteUserQuery = async (req, res) => {
    try {
        const adminId = getUserId(req);
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const result = await UserQueryService.deleteUserQuery({
            queryId: req.params.queryId,
            adminId,
            reason: req.body.reason,
        });
        return res.status(200).json({
            success: true,
            message: "Query deleted successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to delete query"),
        });
    }
};
export const exportUserQueriesCsv = async (req, res) => {
    try {
        const { queryIds, } = req.body;
        const result = await UserQueryService.exportUserQueriesToCsv(queryIds);
        const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="user-queries-${timestamp}.csv"`);
        return res
            .status(200)
            .send(result.csv);
    }
    catch (error) {
        const message = error instanceof Error
            ? error.message
            : "Failed to export user queries";
        const status = message.includes("not found")
            ? 404
            : 400;
        return res
            .status(status)
            .json({
            success: false,
            message,
        });
    }
};
//# sourceMappingURL=userQuery.controllers.js.map