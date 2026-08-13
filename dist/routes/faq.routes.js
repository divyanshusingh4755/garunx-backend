import { Router, } from "express";
import { body, param, query, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { getAllFaqs, getFaqById, createFaq, updateFaq, toggleFaqStatus, deleteFaq, getPublicFaqs, } from "../controllers/faq.controllers.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { requirePermission } from "../middleware/rbac.js";
import { Role } from "../types/rbac.js";
const FAQ_TYPES = [
    "User",
    "Coordinator",
    "User_Query",
    "Coordinator_Query",
];
const SORT_FIELDS = [
    "displayOrder",
    "createdAt",
    "updatedAt",
    "name",
    "faqType",
    "isActive",
    "relevance",
];
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json({
            success: false,
            message: firstError?.msg,
            error: firstError,
        });
    }
    next();
};
const faqIdValidation = [
    param("id").isMongoId().withMessage("Invalid FAQ ID"),
    validateRequest,
];
const createFaqValidation = [
    body("name")
        .isString()
        .withMessage("Name must be a string")
        .trim()
        .notEmpty()
        .withMessage("Name is required"),
    body("question")
        .isString()
        .withMessage("Question must be a string")
        .trim()
        .notEmpty()
        .withMessage("Question is required"),
    body("answer")
        .isString()
        .withMessage("Answer must be a string")
        .trim()
        .notEmpty()
        .withMessage("Answer is required"),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean")
        .toBoolean(),
    body("faqType").optional().isIn(FAQ_TYPES).withMessage("Invalid FAQ type"),
    body("displayOrder")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Display order must be a non-negative integer")
        .toInt(),
    validateRequest,
];
const updateFaqValidation = [
    param("id").isMongoId().withMessage("Invalid FAQ ID"),
    body().custom((value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("Request body must be an object");
        }
        const allowedFields = [
            "name",
            "question",
            "answer",
            "faqType",
            "displayOrder",
        ];
        const hasUpdatableField = allowedFields.some((field) => Object.prototype.hasOwnProperty.call(value, field));
        if (!hasUpdatableField) {
            throw new Error("At least one valid field is required for update");
        }
        return true;
    }),
    body("name")
        .optional()
        .isString()
        .withMessage("Name must be a string")
        .trim()
        .notEmpty()
        .withMessage("Name cannot be empty"),
    body("question")
        .optional()
        .isString()
        .withMessage("Question must be a string")
        .trim()
        .notEmpty()
        .withMessage("Question cannot be empty"),
    body("answer")
        .optional()
        .isString()
        .withMessage("Answer must be a string")
        .trim()
        .notEmpty()
        .withMessage("Answer cannot be empty"),
    body("faqType").optional().isIn(FAQ_TYPES).withMessage("Invalid FAQ type"),
    body("displayOrder")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Display order must be a non-negative integer")
        .toInt(),
    validateRequest,
];
const listFaqValidation = [
    query("faqType").optional().isIn(FAQ_TYPES).withMessage("Invalid FAQ type"),
    query("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be true or false"),
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("page must be a positive integer")
        .toInt(),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be between 1 and 100")
        .toInt(),
    query("sortBy")
        .optional()
        .isIn(SORT_FIELDS)
        .withMessage("Invalid sort field"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("sortOrder must be asc or desc"),
    validateRequest,
];
const publicFaqValidation = [
    query("faqType")
        .optional()
        .isIn(FAQ_TYPES)
        .withMessage("Invalid FAQ type"),
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("page must be a positive integer")
        .toInt(),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be between 1 and 100")
        .toInt(),
    query("sortBy")
        .optional()
        .isIn(SORT_FIELDS)
        .withMessage("Invalid sort field"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("sortOrder must be asc or desc"),
    validateRequest,
];
const router = Router();
router.get("/public", publicFaqValidation, getPublicFaqs);
router.get("/", authenticate, authorizeRoles(Role.ADMIN), requirePermission("faq.read"), listFaqValidation, getAllFaqs);
router.get("/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("faq.read"), faqIdValidation, getFaqById);
router.post("/", authenticate, authorizeRoles(Role.ADMIN), requirePermission("faq.create"), createFaqValidation, createFaq);
router.put("/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("faq.update"), updateFaqValidation, updateFaq);
router.patch("/:id/status", authenticate, authorizeRoles(Role.ADMIN), requirePermission("faq.status"), faqIdValidation, toggleFaqStatus);
router.delete("/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("faq.delete"), faqIdValidation, deleteFaq);
export default router;
//# sourceMappingURL=faq.routes.js.map