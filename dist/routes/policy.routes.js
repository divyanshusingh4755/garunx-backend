import { Router, } from "express";
import { body, param, query, validationResult } from "express-validator";
import { createPolicy, updatePolicy, getAllPolicies, togglePolicyStatus, getPolicyByType, } from "../controllers/policy.controllers.js";
import { authenticate } from "../middleware/authenticate.js";
const router = Router();
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
    next();
};
const policyTypes = ["TERMS", "PRIVACY", "REFUND"];
const userTypes = ["User", "Coordinator"];
const createPolicyValidation = [
    body("type").isIn(policyTypes).withMessage("Invalid policy type"),
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("content").trim().notEmpty().withMessage("Content is required"),
    body("userType")
        .isIn(userTypes)
        .withMessage("Invalid user type"),
    validate,
];
const updatePolicyValidation = [
    param("id").isMongoId().withMessage("Invalid policy id"),
    body("title")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Title cannot be empty"),
    body("content")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Content cannot be empty"),
    validate,
];
const statusValidation = [
    param("id").isMongoId().withMessage("Invalid policy id"),
    body("isActive").isBoolean().withMessage("isActive must be a boolean"),
    validate,
];
const getPoliciesValidation = [
    query("type").optional().isIn(policyTypes).withMessage("Invalid policy type"),
    query("userType")
        .optional()
        .isIn(userTypes)
        .withMessage("Invalid user type"),
    validate,
];
const getPolicyByTypeValidation = [
    param("type").isIn(policyTypes).withMessage("Invalid policy type"),
    query("userType")
        .exists()
        .withMessage("userType is required")
        .isIn(userTypes)
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