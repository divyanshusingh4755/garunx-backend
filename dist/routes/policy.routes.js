import { Router, } from "express";
import { body, param, query, validationResult, } from "express-validator";
import { createPolicy, updatePolicy, getAllPolicies, togglePolicyStatus, getPolicyByType, } from "../controllers/policy.controllers.js";
import { authenticate, } from "../middleware/authenticate.js";
const router = Router();
const POLICY_TYPES = [
    "TERMS",
    "PRIVACY",
    "REFUND",
];
const USER_TYPES = [
    "User",
    "Coordinator",
];
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json({
            success: false,
            message: firstError?.msg,
            error: firstError,
        });
    }
    return next();
};
const createPolicyValidation = [
    body("type")
        .isIn(POLICY_TYPES)
        .withMessage("Invalid policy type"),
    body("title")
        .isString()
        .withMessage("Title must be a string")
        .trim()
        .notEmpty()
        .withMessage("Title is required"),
    body("content")
        .isString()
        .withMessage("Content must be a string")
        .trim()
        .notEmpty()
        .withMessage("Content is required"),
    body("userType")
        .isIn(USER_TYPES)
        .withMessage("Invalid user type"),
    validate,
];
const updatePolicyValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid policy id"),
    body().custom((value) => {
        if (!value ||
            typeof value !== "object" ||
            Array.isArray(value)) {
            throw new Error("Request body must be an object");
        }
        const hasAllowedField = [
            "title",
            "content",
        ].some((field) => Object.prototype.hasOwnProperty.call(value, field));
        if (!hasAllowedField) {
            throw new Error("At least one valid field is required for update");
        }
        return true;
    }),
    body("title")
        .optional()
        .isString()
        .withMessage("Title must be a string")
        .trim()
        .notEmpty()
        .withMessage("Title cannot be empty"),
    body("content")
        .optional()
        .isString()
        .withMessage("Content must be a string")
        .trim()
        .notEmpty()
        .withMessage("Content cannot be empty"),
    validate,
];
const statusValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid policy id"),
    body("isActive")
        .exists()
        .withMessage("isActive is required")
        .isBoolean()
        .withMessage("isActive must be a boolean")
        .toBoolean(),
    validate,
];
const getPoliciesValidation = [
    query("type")
        .optional()
        .isIn(POLICY_TYPES)
        .withMessage("Invalid policy type"),
    query("userType")
        .optional()
        .isIn(USER_TYPES)
        .withMessage("Invalid user type"),
    query("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be true or false"),
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("page must be greater than 0")
        .toInt(),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be between 1 and 100")
        .toInt(),
    validate,
];
const getPolicyByTypeValidation = [
    param("type")
        .isIn(POLICY_TYPES)
        .withMessage("Invalid policy type"),
    query("userType")
        .exists()
        .withMessage("userType is required")
        .isIn(USER_TYPES)
        .withMessage("Invalid user type"),
    validate,
];
router.get("/", authenticate, getPoliciesValidation, getAllPolicies);
router.post("/", authenticate, createPolicyValidation, createPolicy);
router.put("/:id", authenticate, updatePolicyValidation, updatePolicy);
router.patch("/:id/status", authenticate, statusValidation, togglePolicyStatus);
router.get("/:type", getPolicyByTypeValidation, getPolicyByType);
export default router;
//# sourceMappingURL=policy.routes.js.map