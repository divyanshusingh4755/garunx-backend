import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import { body, param, query, validationResult } from "express-validator";

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

const QUERY_STATUSES = ["PENDING", "ONGOING", "RESOLVED", "REJECTED"] as const;

const QUERY_CATEGORIES = [
  "BOOKING",
  "PAYMENT",
  "REFUND",
  "SERVICE",
  "PACKAGE",
  "ACCOUNT",
  "TECHNICAL",
  "OTHER",
] as const;

const QUERY_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

const REQUESTER_TYPES = ["USER", "COORDINATOR"] as const;

const SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "latestMessageAt",
  "lastActionAt",
] as const;

const ADMIN_SORT_FIELDS = [...SORT_FIELDS, "priority"] as const;

const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];

    return res.status(400).json({
      success: false,
      message: firstError?.msg ?? "Validation failed",
      error: firstError,
    });
  }

  return next();
};

const queryIdValidator = param("queryId")
  .isMongoId()
  .withMessage("Invalid query id");

const messageValidation = [
  body("message")
    .optional({ nullable: true })
    .isString()
    .withMessage("Message must be a string")
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Message cannot exceed 2000 characters"),

  body("imageUrls")
    .optional()
    .isArray({ max: 5 })
    .withMessage("imageUrls must be an array with maximum 5 images"),

  body("imageUrls.*")
    .optional()
    .isString()
    .withMessage("Each image URL must be a string")
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Image URL cannot exceed 2000 characters")
    .isURL({
      protocols: ["http", "https"],
      require_protocol: true,
    })
    .withMessage("Each image URL must be a valid HTTP or HTTPS URL"),

  body().custom((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Request body must be an object");
    }

    const hasMessage =
      typeof value.message === "string" && value.message.trim().length > 0;

    const hasImages =
      Array.isArray(value.imageUrls) && value.imageUrls.length > 0;

    if (!hasMessage && !hasImages) {
      throw new Error("Message or at least one image is required");
    }

    return true;
  }),
];

export const createUserQueryValidation = [
  body("subject")
    .isString()
    .withMessage("Subject must be a string")
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Subject must be between 3 and 200 characters"),

  body("category").isIn(QUERY_CATEGORIES).withMessage("Invalid query category"),

  ...messageValidation,
  validate,
];

export const getMyQueriesValidation = [
  query("status")
    .optional()
    .isIn(QUERY_STATUSES)
    .withMessage("Invalid query status"),

  query("category")
    .optional()
    .isIn(QUERY_CATEGORIES)
    .withMessage("Invalid query category"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be greater than 0")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),

  query("sortBy")
    .optional()
    .isIn(SORT_FIELDS)
    .withMessage("Invalid sort field"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),

  validate,
];

export const getUserQueryByIdValidation = [queryIdValidator, validate];

export const sendUserQueryMessageValidation = [
  queryIdValidator,
  ...messageValidation,
  validate,
];

export const markUserQueryAsReadValidation = [queryIdValidator, validate];

export const getAllUserQueriesValidation = [
  query("searchTerm")
    .optional()
    .isString()
    .withMessage("Search term must be a string")
    .trim()
    .isLength({ max: 200 })
    .withMessage("Search term cannot exceed 200 characters"),

  query("status")
    .optional()
    .isIn(QUERY_STATUSES)
    .withMessage("Invalid query status"),

  query("category")
    .optional()
    .isIn(QUERY_CATEGORIES)
    .withMessage("Invalid query category"),

  query("priority")
    .optional()
    .isIn(QUERY_PRIORITIES)
    .withMessage("Invalid query priority"),

  query("requesterType")
    .optional()
    .isIn(REQUESTER_TYPES)
    .withMessage("Invalid requester type"),

  query("assignedAdminId")
    .optional()
    .isMongoId()
    .withMessage("Invalid assigned admin id"),

  query("requesterId")
    .optional()
    .isMongoId()
    .withMessage("Invalid requester id"),

  query("isDeleted")
    .optional()
    .isBoolean()
    .withMessage("isDeleted must be true or false"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be greater than 0")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),

  query("sortBy")
    .optional()
    .isIn(ADMIN_SORT_FIELDS)
    .withMessage("Invalid sort field"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),

  validate,
];

export const sendAdminQueryReplyValidation = [
  queryIdValidator,
  ...messageValidation,
  validate,
];

export const updateUserQueryStatusValidation = [
  queryIdValidator,

  body("status").isIn(QUERY_STATUSES).withMessage("Invalid query status"),

  body("reason")
    .optional({ nullable: true })
    .isString()
    .withMessage("Reason must be a string")
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Reason cannot exceed 1000 characters"),

  body().custom((value) => {
    if (
      value?.status === "REJECTED" &&
      (typeof value.reason !== "string" || !value.reason.trim())
    ) {
      throw new Error("Reason is required when rejecting a query");
    }

    return true;
  }),

  validate,
];

export const updateUserQueryPriorityValidation = [
  queryIdValidator,

  body("priority").isIn(QUERY_PRIORITIES).withMessage("Invalid query priority"),

  body("reason")
    .optional({ nullable: true })
    .isString()
    .withMessage("Reason must be a string")
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Reason cannot exceed 1000 characters"),

  validate,
];

export const updateUserQueryCategoryValidation = [
  queryIdValidator,

  body("category").isIn(QUERY_CATEGORIES).withMessage("Invalid query category"),

  body("reason")
    .optional({ nullable: true })
    .isString()
    .withMessage("Reason must be a string")
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Reason cannot exceed 1000 characters"),

  validate,
];

export const assignUserQueryValidation = [
  queryIdValidator,

  body("adminId").isMongoId().withMessage("Invalid admin id"),

  validate,
];

export const deleteUserQueryValidation = [
  queryIdValidator,

  body("reason")
    .isString()
    .withMessage("Deletion reason must be a string")
    .trim()
    .isLength({ min: 3, max: 1000 })
    .withMessage("Deletion reason must be between 3 and 1000 characters"),

  validate,
];

router.post("/", authenticate, createUserQueryValidation, createUserQuery);

router.get("/my-queries", authenticate, getMyQueriesValidation, getMyQueries);

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

router.get(
  "/:queryId",
  authenticate,
  getUserQueryByIdValidation,
  getUserQueryById,
);

export default router;
