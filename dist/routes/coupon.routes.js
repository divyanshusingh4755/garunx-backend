import { Router, } from "express";
import { body, param, query, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { getAllCoupons, getCouponById, createCoupon, updateCoupon, toggleCouponStatus, deleteCoupon, validateCoupon, } from "../controllers/coupon.controllers.js";
const APPLICABLE_TYPES = ["ALL", "SERVICE", "PACKAGE", "REFERRAL"];
const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED"];
const SORT_FIELDS = [
    "createdAt",
    "updatedAt",
    "name",
    "couponCode",
    "applicableOn",
    "discount",
    "usageLimit",
    "usedCount",
    "validFrom",
    "validTill",
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
    return next();
};
const couponIdValidation = [
    param("id").isMongoId().withMessage("Invalid coupon ID"),
    validateRequest,
];
const commonCouponFieldValidation = [
    body("name")
        .optional()
        .isString()
        .withMessage("Name must be a string")
        .trim()
        .notEmpty()
        .withMessage("Name cannot be empty"),
    body("couponCode")
        .optional()
        .isString()
        .withMessage("Coupon code must be a string")
        .trim()
        .notEmpty()
        .withMessage("Coupon code cannot be empty")
        .toUpperCase(),
    body("applicableOn")
        .optional()
        .isIn(APPLICABLE_TYPES)
        .withMessage("Invalid applicable type"),
    body("services")
        .optional()
        .isArray()
        .withMessage("Services must be an array"),
    body("services.*")
        .optional()
        .isMongoId()
        .withMessage("Each service must be a valid service ID"),
    body("packages")
        .optional()
        .isArray()
        .withMessage("Packages must be an array"),
    body("packages.*")
        .optional()
        .isMongoId()
        .withMessage("Each package must be a valid package ID"),
    body("assignedUserId")
        .optional({ nullable: true })
        .isMongoId()
        .withMessage("assignedUserId must be a valid user ID"),
    body("discount")
        .optional()
        .isFloat({ gt: 0 })
        .withMessage("Discount must be greater than 0")
        .toFloat(),
    body("discountType")
        .optional()
        .isIn(DISCOUNT_TYPES)
        .withMessage("Invalid discount type"),
    body("usageLimit")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Usage limit must be a non-negative integer")
        .toInt(),
    body("validFrom")
        .optional()
        .isISO8601()
        .withMessage("validFrom must be a valid date")
        .toDate(),
    body("validTill")
        .optional()
        .isISO8601()
        .withMessage("validTill must be a valid date")
        .toDate(),
    body("minOrderAmount")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Minimum order amount must be greater than or equal to 0")
        .toFloat(),
    body("maxDiscountAmount")
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage("Maximum discount amount must be greater than or equal to 0")
        .toFloat(),
    body("isFirstOrderOnly")
        .optional()
        .isBoolean()
        .withMessage("isFirstOrderOnly must be a boolean")
        .toBoolean(),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean")
        .toBoolean(),
];
const validateCouponCombination = body().custom((_, { req }) => {
    const { applicableOn, services, packages, assignedUserId, discount, discountType, maxDiscountAmount, validFrom, validTill, } = req.body;
    if (applicableOn === "SERVICE") {
        if (!Array.isArray(services) || services.length === 0) {
            throw new Error("At least one service is required for SERVICE coupons");
        }
        if (Array.isArray(packages) && packages.length > 0) {
            throw new Error("Packages are not allowed for SERVICE coupons");
        }
    }
    if (applicableOn === "PACKAGE") {
        if (!Array.isArray(packages) || packages.length === 0) {
            throw new Error("At least one package is required for PACKAGE coupons");
        }
        if (Array.isArray(services) && services.length > 0) {
            throw new Error("Services are not allowed for PACKAGE coupons");
        }
    }
    if (applicableOn === "ALL" || applicableOn === "REFERRAL") {
        if ((Array.isArray(services) && services.length > 0) ||
            (Array.isArray(packages) && packages.length > 0)) {
            throw new Error("Services and packages are not allowed for this coupon type");
        }
    }
    if (applicableOn === "REFERRAL" && !assignedUserId) {
        throw new Error("assignedUserId is required for REFERRAL coupons");
    }
    if (discountType === "PERCENTAGE" &&
        discount !== undefined &&
        (Number(discount) <= 0 || Number(discount) > 100)) {
        throw new Error("Percentage discount must be between 1 and 100");
    }
    if (discountType === "FIXED" &&
        maxDiscountAmount !== undefined &&
        maxDiscountAmount !== null) {
        throw new Error("maxDiscountAmount is allowed only for percentage coupons");
    }
    if (validFrom && validTill && new Date(validTill) < new Date(validFrom)) {
        throw new Error("validTill must be greater than or equal to validFrom");
    }
    return true;
});
const createCouponValidation = [
    body("name").exists().withMessage("Name is required"),
    body("couponCode").exists().withMessage("Coupon code is required"),
    body("applicableOn").exists().withMessage("Applicable type is required"),
    body("discount").exists().withMessage("Discount is required"),
    body("discountType").exists().withMessage("Discount type is required"),
    ...commonCouponFieldValidation,
    validateCouponCombination,
    validateRequest,
];
const updateCouponValidation = [
    param("id").isMongoId().withMessage("Invalid coupon ID"),
    body().custom((value) => {
        if (!value ||
            typeof value !== "object" ||
            Array.isArray(value) ||
            Object.keys(value).length === 0) {
            throw new Error("At least one field is required for update");
        }
        return true;
    }),
    ...commonCouponFieldValidation,
    validateRequest,
];
const couponLookupValidation = [
    body("couponCode")
        .isString()
        .withMessage("Coupon code must be a string")
        .trim()
        .notEmpty()
        .withMessage("Coupon code is required")
        .toUpperCase(),
    body("serviceId").optional().isMongoId().withMessage("Invalid service ID"),
    body("packageId").optional().isMongoId().withMessage("Invalid package ID"),
    body("amount")
        .isFloat({ min: 0 })
        .withMessage("Amount must be a non-negative number")
        .toFloat(),
    body("isFirstOrder")
        .optional()
        .isBoolean()
        .withMessage("isFirstOrder must be a boolean")
        .toBoolean(),
    validateRequest,
];
const listCouponValidation = [
    query("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be true or false"),
    query("assignedUserId")
        .optional()
        .isMongoId()
        .withMessage("Invalid assigned user ID"),
    query("applicableOn")
        .optional()
        .custom((value) => {
        const values = Array.isArray(value) ? value : String(value).split(",");
        return values.every((item) => APPLICABLE_TYPES.includes(String(item)
            .trim()
            .toUpperCase()));
    })
        .withMessage("Invalid applicable type"),
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
router.get("/", listCouponValidation, getAllCoupons);
router.post("/validate", authenticate, couponLookupValidation, validateCoupon);
router.get("/:id", authenticate, couponIdValidation, getCouponById);
router.post("/", authenticate, createCouponValidation, createCoupon);
router.put("/:id", authenticate, updateCouponValidation, updateCoupon);
router.patch("/:id/status", authenticate, couponIdValidation, toggleCouponStatus);
router.delete("/:id", authenticate, couponIdValidation, deleteCoupon);
export default router;
//# sourceMappingURL=coupon.routes.js.map