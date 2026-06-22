import { Router, } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { getAllCoupons, getCouponById, createCoupon, updateCoupon, toggleCouponStatus, deleteCoupon, validateCoupon, } from "../controllers/coupon.controllers.js";
const couponValidation = [
    body("name").notEmpty().withMessage("Name is required").isString().trim(),
    body("couponCode")
        .notEmpty()
        .withMessage("Coupon code is required")
        .isString()
        .trim()
        .toUpperCase(),
    body("applicableOn")
        .notEmpty()
        .withMessage("Applicable type is required")
        .isIn(["ALL", "SERVICE", "PACKAGE"])
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
    body().custom((_, { req }) => {
        const { applicableOn, services, packages } = req.body;
        if (applicableOn === "SERVICE") {
            if (!Array.isArray(services) || services.length === 0) {
                throw new Error("At least one service is required for SERVICE coupons");
            }
            if (packages?.length) {
                throw new Error("Packages are not allowed for SERVICE coupons");
            }
        }
        if (applicableOn === "PACKAGE") {
            if (!Array.isArray(packages) || packages.length === 0) {
                throw new Error("At least one package is required for PACKAGE coupons");
            }
            if (services?.length) {
                throw new Error("Services are not allowed for PACKAGE coupons");
            }
        }
        if (applicableOn === "ALL") {
            if (services?.length || packages?.length) {
                throw new Error("Services and packages should not be supplied for ALL coupons");
            }
        }
        return true;
    }),
    body("discount")
        .notEmpty()
        .withMessage("Discount is required")
        .isFloat({ min: 0 })
        .withMessage("Discount must be greater than or equal to 0"),
    body("discountType")
        .notEmpty()
        .withMessage("Discount type is required")
        .isIn(["PERCENTAGE", "FIXED"])
        .withMessage("Invalid discount type"),
    body("discount").custom((discount, { req }) => {
        if (req.body.discountType === "PERCENTAGE" &&
            (Number(discount) <= 0 || Number(discount) > 100)) {
            throw new Error("Percentage discount must be between 1 and 100");
        }
        return true;
    }),
    body("usageLimit")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Usage limit must be a non-negative integer"),
    body("validFrom")
        .optional()
        .isISO8601()
        .withMessage("validFrom must be a valid date"),
    body("validTill")
        .optional()
        .isISO8601()
        .withMessage("validTill must be a valid date"),
    body("validTill").custom((value, { req }) => {
        if (req.body.validFrom &&
            value &&
            new Date(value) < new Date(req.body.validFrom)) {
            throw new Error("validTill must be greater than validFrom");
        }
        return true;
    }),
    body("minOrderAmount")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Minimum order amount must be greater than or equal to 0"),
    body("maxDiscountAmount")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Maximum discount amount must be greater than or equal to 0")
        .custom((value, { req }) => {
        if (req.body.discountType === "FIXED" && value !== undefined) {
            throw new Error("maxDiscountAmount is allowed only for percentage coupons");
        }
        return true;
    }),
    body("isFirstOrderOnly")
        .optional()
        .isBoolean()
        .withMessage("isFirstOrderOnly must be a boolean"),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
    (req, res, next) => {
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
    },
];
const router = Router();
router.get("/", getAllCoupons);
router.post("/validate", authenticate, validateCoupon);
router.get("/:id", authenticate, getCouponById);
router.post("/", authenticate, couponValidation, createCoupon);
router.put("/:id", authenticate, couponValidation, updateCoupon);
router.patch("/:id/status", authenticate, toggleCouponStatus);
router.delete("/:id", authenticate, deleteCoupon);
export default router;
//# sourceMappingURL=coupon.routes.js.map