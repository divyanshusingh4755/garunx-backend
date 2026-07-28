import {
    Router,
    type Request,
    type Response,
    type NextFunction,
} from "express";

import {
    body,
    param,
    query,
    validationResult,
} from "express-validator";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";

import {
    createUserQuery,
    getMyQueries,
    getUserQueryById,
    sendUserQueryMessage,
    markUserQueryAsRead,

    getAllUserQueries,
    getAdminUserQueryById,
    sendAdminQueryReply,
    updateUserQueryStatus,
    updateUserQueryPriority,
    updateUserQueryCategory,
    assignUserQuery,
    deleteUserQuery,
} from "../controllers/userQuery.controllers.js";

const router = Router();

const validate = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const errors =
        validationResult(req);

    if (!errors.isEmpty()) {
        const firstError =
            errors.array()[0];

        return res.status(400).json({
            success: false,
            message:
                firstError?.msg ||
                "Validation failed",
            error: firstError,
        });
    }

    next();
};


// =========================
// REUSABLE QUERY ID
// =========================

const queryIdValidator =
    param("queryId")
        .notEmpty()
        .withMessage(
            "Query id is required",
        )
        .isMongoId()
        .withMessage(
            "Invalid query id",
        );


// =========================
// CREATE QUERY
// USER + COORDINATOR
// =========================

export const createUserQueryValidation = [
    body("subject")
        .notEmpty()
        .withMessage(
            "Subject is required",
        )
        .isString()
        .withMessage(
            "Subject must be a string",
        )
        .trim()
        .isLength({
            min: 3,
            max: 200,
        })
        .withMessage(
            "Subject must be between 3 and 200 characters",
        ),

    body("category")
        .notEmpty()
        .withMessage(
            "Category is required",
        )
        .isIn([
            "BOOKING",
            "PAYMENT",
            "REFUND",
            "SERVICE",
            "PACKAGE",
            "ACCOUNT",
            "TECHNICAL",
            "OTHER",
        ])
        .withMessage(
            "Invalid query category",
        ),

    body("message")
        .optional({
            nullable: true,
        })
        .isString()
        .withMessage(
            "Message must be a string",
        )
        .trim()
        .isLength({
            max: 2000,
        })
        .withMessage(
            "Message cannot exceed 2000 characters",
        ),

    body("imageUrls")
        .optional()
        .isArray({
            max: 5,
        })
        .withMessage(
            "imageUrls must be an array with maximum 5 images",
        ),

    body("imageUrls.*")
        .isString()
        .withMessage(
            "Each image URL must be a string",
        )
        .trim()
        .isLength({
            max: 2000,
        })
        .withMessage(
            "Image URL cannot exceed 2000 characters",
        )
        .isURL()
        .withMessage(
            "Each image URL must be a valid URL",
        ),

    body().custom((value) => {
        const hasMessage =
            typeof value.message ===
                "string" &&
            value.message.trim()
                .length > 0;

        const hasImages =
            Array.isArray(
                value.imageUrls,
            ) &&
            value.imageUrls.length > 0;

        if (
            !hasMessage &&
            !hasImages
        ) {
            throw new Error(
                "Message or at least one image is required",
            );
        }

        return true;
    }),

    validate,
];


// =========================
// GET MY QUERIES
// USER + COORDINATOR
// =========================

export const getMyQueriesValidation = [
    query("status")
        .optional()
        .isIn([
            "PENDING",
            "ONGOING",
            "RESOLVED",
            "REJECTED",
        ])
        .withMessage(
            "Invalid query status",
        ),

    query("category")
        .optional()
        .isIn([
            "BOOKING",
            "PAYMENT",
            "REFUND",
            "SERVICE",
            "PACKAGE",
            "ACCOUNT",
            "TECHNICAL",
            "OTHER",
        ])
        .withMessage(
            "Invalid query category",
        ),

    query("page")
        .optional()
        .isInt({
            min: 1,
        })
        .withMessage(
            "Page must be greater than 0",
        ),

    query("limit")
        .optional()
        .isInt({
            min: 1,
            max: 100,
        })
        .withMessage(
            "Limit must be between 1 and 100",
        ),

    query("sortBy")
        .optional()
        .isIn([
            "createdAt",
            "updatedAt",
            "latestMessageAt",
            "lastActionAt",
        ])
        .withMessage(
            "Invalid sort field",
        ),

    query("sortOrder")
        .optional()
        .isIn([
            "asc",
            "desc",
        ])
        .withMessage(
            "Sort order must be asc or desc",
        ),

    validate,
];


// =========================
// GET QUERY BY ID
// =========================

export const getUserQueryByIdValidation = [
    queryIdValidator,
    validate,
];


// =========================
// REQUESTER SEND MESSAGE
// USER + COORDINATOR
// =========================

export const sendUserQueryMessageValidation = [
    queryIdValidator,

    body("message")
        .optional({
            nullable: true,
        })
        .isString()
        .withMessage(
            "Message must be a string",
        )
        .trim()
        .isLength({
            max: 2000,
        })
        .withMessage(
            "Message cannot exceed 2000 characters",
        ),

    body("imageUrls")
        .optional()
        .isArray({
            max: 5,
        })
        .withMessage(
            "imageUrls must be an array with maximum 5 images",
        ),

    body("imageUrls.*")
        .isString()
        .withMessage(
            "Each image URL must be a string",
        )
        .trim()
        .isLength({
            max: 2000,
        })
        .withMessage(
            "Image URL cannot exceed 2000 characters",
        )
        .isURL()
        .withMessage(
            "Each image URL must be a valid URL",
        ),

    body().custom((value) => {
        const hasMessage =
            typeof value.message ===
                "string" &&
            value.message.trim()
                .length > 0;

        const hasImages =
            Array.isArray(
                value.imageUrls,
            ) &&
            value.imageUrls.length > 0;

        if (
            !hasMessage &&
            !hasImages
        ) {
            throw new Error(
                "Message or at least one image is required",
            );
        }

        return true;
    }),

    validate,
];


// =========================
// MARK READ
// =========================

export const markUserQueryAsReadValidation = [
    queryIdValidator,
    validate,
];


// =========================
// ADMIN GET ALL
// =========================

export const getAllUserQueriesValidation = [
    query("searchTerm")
        .optional()
        .isString()
        .withMessage(
            "Search term must be a string",
        )
        .trim()
        .isLength({
            max: 200,
        })
        .withMessage(
            "Search term cannot exceed 200 characters",
        ),

    query("status")
        .optional()
        .isIn([
            "PENDING",
            "ONGOING",
            "RESOLVED",
            "REJECTED",
        ])
        .withMessage(
            "Invalid query status",
        ),

    query("category")
        .optional()
        .isIn([
            "BOOKING",
            "PAYMENT",
            "REFUND",
            "SERVICE",
            "PACKAGE",
            "ACCOUNT",
            "TECHNICAL",
            "OTHER",
        ])
        .withMessage(
            "Invalid query category",
        ),

    query("priority")
        .optional()
        .isIn([
            "LOW",
            "NORMAL",
            "HIGH",
            "URGENT",
        ])
        .withMessage(
            "Invalid query priority",
        ),

    query("requesterType")
        .optional()
        .isIn([
            "USER",
            "COORDINATOR",
        ])
        .withMessage(
            "Invalid requester type",
        ),

    query("assignedAdminId")
        .optional()
        .isMongoId()
        .withMessage(
            "Invalid assigned admin id",
        ),

    query("requesterId")
        .optional()
        .isMongoId()
        .withMessage(
            "Invalid requester id",
        ),

    query("isDeleted")
        .optional()
        .isBoolean()
        .withMessage(
            "isDeleted must be true or false",
        ),

    query("page")
        .optional()
        .isInt({
            min: 1,
        })
        .withMessage(
            "Page must be greater than 0",
        ),

    query("limit")
        .optional()
        .isInt({
            min: 1,
            max: 100,
        })
        .withMessage(
            "Limit must be between 1 and 100",
        ),

    query("sortBy")
        .optional()
        .isIn([
            "createdAt",
            "updatedAt",
            "latestMessageAt",
            "lastActionAt",
            "priority",
        ])
        .withMessage(
            "Invalid sort field",
        ),

    query("sortOrder")
        .optional()
        .isIn([
            "asc",
            "desc",
        ])
        .withMessage(
            "Sort order must be asc or desc",
        ),

    validate,
];


// =========================
// ADMIN REPLY
// =========================

export const sendAdminQueryReplyValidation = [
    queryIdValidator,

    body("message")
        .optional({
            nullable: true,
        })
        .isString()
        .withMessage(
            "Message must be a string",
        )
        .trim()
        .isLength({
            max: 2000,
        })
        .withMessage(
            "Message cannot exceed 2000 characters",
        ),

    body("imageUrls")
        .optional()
        .isArray({
            max: 5,
        })
        .withMessage(
            "imageUrls must be an array with maximum 5 images",
        ),

    body("imageUrls.*")
        .isString()
        .withMessage(
            "Each image URL must be a string",
        )
        .trim()
        .isLength({
            max: 2000,
        })
        .withMessage(
            "Image URL cannot exceed 2000 characters",
        )
        .isURL()
        .withMessage(
            "Each image URL must be a valid URL",
        ),

    body().custom((value) => {
        const hasMessage =
            typeof value.message ===
                "string" &&
            value.message.trim()
                .length > 0;

        const hasImages =
            Array.isArray(
                value.imageUrls,
            ) &&
            value.imageUrls.length > 0;

        if (
            !hasMessage &&
            !hasImages
        ) {
            throw new Error(
                "Message or at least one image is required",
            );
        }

        return true;
    }),

    validate,
];


// =========================
// UPDATE STATUS
// =========================

export const updateUserQueryStatusValidation = [
    queryIdValidator,

    body("status")
        .notEmpty()
        .withMessage(
            "Status is required",
        )
        .isIn([
            "PENDING",
            "ONGOING",
            "RESOLVED",
            "REJECTED",
        ])
        .withMessage(
            "Invalid query status",
        ),

    body("reason")
        .optional({
            nullable: true,
        })
        .isString()
        .withMessage(
            "Reason must be a string",
        )
        .trim()
        .isLength({
            max: 1000,
        })
        .withMessage(
            "Reason cannot exceed 1000 characters",
        ),

    body().custom((value) => {
        if (
            value.status ===
                "REJECTED" &&
            (
                typeof value.reason !==
                    "string" ||
                !value.reason.trim()
            )
        ) {
            throw new Error(
                "Reason is required when rejecting a query",
            );
        }

        return true;
    }),

    validate,
];


// =========================
// UPDATE PRIORITY
// =========================

export const updateUserQueryPriorityValidation = [
    queryIdValidator,

    body("priority")
        .notEmpty()
        .withMessage(
            "Priority is required",
        )
        .isIn([
            "LOW",
            "NORMAL",
            "HIGH",
            "URGENT",
        ])
        .withMessage(
            "Invalid query priority",
        ),

    body("reason")
        .optional({
            nullable: true,
        })
        .isString()
        .withMessage(
            "Reason must be a string",
        )
        .trim()
        .isLength({
            max: 1000,
        })
        .withMessage(
            "Reason cannot exceed 1000 characters",
        ),

    validate,
];


// =========================
// UPDATE CATEGORY
// =========================

export const updateUserQueryCategoryValidation = [
    queryIdValidator,

    body("category")
        .notEmpty()
        .withMessage(
            "Category is required",
        )
        .isIn([
            "BOOKING",
            "PAYMENT",
            "REFUND",
            "SERVICE",
            "PACKAGE",
            "ACCOUNT",
            "TECHNICAL",
            "OTHER",
        ])
        .withMessage(
            "Invalid query category",
        ),

    body("reason")
        .optional({
            nullable: true,
        })
        .isString()
        .withMessage(
            "Reason must be a string",
        )
        .trim()
        .isLength({
            max: 1000,
        })
        .withMessage(
            "Reason cannot exceed 1000 characters",
        ),

    validate,
];


// =========================
// ASSIGN QUERY
// =========================

export const assignUserQueryValidation = [
    queryIdValidator,

    body("adminId")
        .notEmpty()
        .withMessage(
            "Admin id is required",
        )
        .isMongoId()
        .withMessage(
            "Invalid admin id",
        ),

    validate,
];


// =========================
// DELETE QUERY
// =========================

export const deleteUserQueryValidation = [
    queryIdValidator,

    body("reason")
        .notEmpty()
        .withMessage(
            "Deletion reason is required",
        )
        .isString()
        .withMessage(
            "Deletion reason must be a string",
        )
        .trim()
        .isLength({
            min: 3,
            max: 1000,
        })
        .withMessage(
            "Deletion reason must be between 3 and 1000 characters",
        ),

    validate,
];


// =========================
// REQUESTER ROUTES
// USER + COORDINATOR
// =========================

router.post(
    "/",
    authenticate,
    createUserQueryValidation,
    createUserQuery,
);

router.get(
    "/my-queries",
    authenticate,
    getMyQueriesValidation,
    getMyQueries,
);


// =========================
// ADMIN ROUTES
// =========================

router.get(
    "/admin",
    authenticate,
    authorizeRoles(Role.ADMIN),
    getAllUserQueriesValidation,
    getAllUserQueries,
);

router.get(
    "/admin/:queryId",
    authenticate,
    authorizeRoles(Role.ADMIN),
    getUserQueryByIdValidation,
    getAdminUserQueryById,
);


// =========================
// QUERY ACTIONS
// =========================

router.post(
    "/:queryId/messages",
    authenticate,
    sendUserQueryMessageValidation,
    sendUserQueryMessage,
);

router.patch(
    "/:queryId/read",
    authenticate,
    markUserQueryAsReadValidation,
    markUserQueryAsRead,
);

router.post(
    "/:queryId/admin-reply",
    authenticate,
    authorizeRoles(Role.ADMIN),
    sendAdminQueryReplyValidation,
    sendAdminQueryReply,
);

router.patch(
    "/:queryId/status",
    authenticate,
    authorizeRoles(Role.ADMIN),
    updateUserQueryStatusValidation,
    updateUserQueryStatus,
);

router.patch(
    "/:queryId/priority",
    authenticate,
    authorizeRoles(Role.ADMIN),
    updateUserQueryPriorityValidation,
    updateUserQueryPriority,
);

router.patch(
    "/:queryId/category",
    authenticate,
    authorizeRoles(Role.ADMIN),
    updateUserQueryCategoryValidation,
    updateUserQueryCategory,
);

router.patch(
    "/:queryId/assign",
    authenticate,
    authorizeRoles(Role.ADMIN),
    assignUserQueryValidation,
    assignUserQuery,
);

router.delete(
    "/:queryId",
    authenticate,
    authorizeRoles(Role.ADMIN),
    deleteUserQueryValidation,
    deleteUserQuery,
);


// Keep generic detail route last
router.get(
    "/:queryId",
    authenticate,
    getUserQueryByIdValidation,
    getUserQueryById,
);

export default router;