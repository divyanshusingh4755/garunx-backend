import { Router } from "express";
import { body, param, query, } from "express-validator";
import { approveWithdrawal, cancelWithdrawal, createWithdrawal, getAllWithdrawalsAdmin, getMyWithdrawalById, getMyWithdrawals, getWithdrawalByIdAdmin, markWithdrawalPaid, markWithdrawalProcessing, rejectWithdrawal, } from "../controllers/withdrawal.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { requirePermission } from "../middleware/rbac.js";
import { Role } from "../types/rbac.js";
import { validate } from "../utils/validate.js";
const router = Router();
const withdrawalIdValidation = [
    param("withdrawalRequestId").isMongoId().withMessage("Invalid withdrawal request id"),
    validate,
];
const createWithdrawalValidation = [
    body("amount").exists({ checkNull: true })
        .withMessage("amount is required").isFloat({ gt: 0, })
        .withMessage("amount must be greater than zero").toFloat(),
    // Currently bank withdrawal only. Bank destination is read from the user's verified bank details on the server.
    body().custom((payload) => {
        const allowedFields = ["amount"];
        const invalidFields = Object.keys(payload).filter((field) => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid fields: ${invalidFields.join(", ")}`);
        }
        return true;
    }),
    validate,
];
const myWithdrawalListValidation = [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
    query("status").optional().isIn(["PENDING", "APPROVED", "PROCESSING", "PAID", "REJECTED", "CANCELLED"]).withMessage("Invalid withdrawal status"),
    validate,
];
const cancelWithdrawalValidation = [
    param("withdrawalRequestId").isMongoId().withMessage("Invalid withdrawal request id"),
    body("reason").optional({ checkFalsy: true }).isString().withMessage("reason must be string").trim().isLength({ max: 500 }).withMessage("reason cannot exceed 500 characters"),
    body().custom((payload) => {
        const allowedFields = ["reason"];
        const invalidFields = Object.keys(payload).filter((field) => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid fields: ${invalidFields.join(", ")}`);
        }
        return true;
    }),
    validate,
];
const adminWithdrawalListValidation = [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
    query("status").optional().isIn(["PENDING", "APPROVED", "PROCESSING", "PAID", "REJECTED", "CANCELLED"]).withMessage("Invalid withdrawal status"),
    query("ownerRole").optional().isIn([Role.USER, Role.COORDINATOR]).withMessage("ownerRole must be USER or COORDINATOR"),
    query("ownerId").optional().isMongoId().withMessage("Invalid owner id"),
    query("sortOrder").optional().isIn(["asc", "desc"]).withMessage("sortOrder must be asc or desc"),
    validate,
];
const approveWithdrawalValidation = [
    param("withdrawalRequestId").isMongoId().withMessage("Invalid withdrawal request id"),
    validate,
];
const markProcessingValidation = [
    param("withdrawalRequestId").isMongoId().withMessage("Invalid withdrawal request id"),
    body("adminNotes").optional({ checkFalsy: true }).isString().withMessage("adminNotes must be string").trim().isLength({ max: 1000 }).withMessage("adminNotes cannot exceed 1000 characters"),
    body().custom((payload) => {
        const allowedFields = ["adminNotes"];
        const invalidFields = Object.keys(payload).filter((field) => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid fields: ${invalidFields.join(", ")}`);
        }
        return true;
    }),
    validate,
];
const rejectWithdrawalValidation = [
    param("withdrawalRequestId").isMongoId().withMessage("Invalid withdrawal request id"),
    body("reason").notEmpty().withMessage("reason is required").isString().withMessage("reason must be string").trim().isLength({ max: 500, }).withMessage("reason cannot exceed 500 characters"),
    body("adminNotes").optional({ checkFalsy: true, }).isString().withMessage("adminNotes must be string").trim().isLength({ max: 1000, }).withMessage("adminNotes cannot exceed 1000 characters"),
    body().custom((payload) => {
        const allowedFields = ["reason", "adminNotes"];
        const invalidFields = Object.keys(payload).filter((field) => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid fields: ${invalidFields.join(", ")}`);
        }
        return true;
    }),
    validate,
];
const markPaidValidation = [
    param("withdrawalRequestId").isMongoId().withMessage("Invalid withdrawal request id"),
    body("paymentMethod").notEmpty().withMessage("paymentMethod is required").isIn(["NEFT", "IMPS", "RTGS", "UPI", "BANK_TRANSFER", "OTHER"]).withMessage("Invalid payment method"),
    body("paymentReference").notEmpty().withMessage("paymentReference is required").isString().withMessage("paymentReference must be string").trim().isLength({ max: 200, }).withMessage("paymentReference cannot exceed 200 characters"),
    body("adminNotes").optional({ checkFalsy: true, }).isString().withMessage("adminNotes must be string").trim().isLength({ max: 1000, }).withMessage("adminNotes cannot exceed 1000 characters"),
    body().custom((payload) => {
        const allowedFields = ["paymentMethod", "paymentReference", "adminNotes"];
        const invalidFields = Object.keys(payload).filter((field) => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid fields: ${invalidFields.join(", ")}`);
        }
        return true;
    }),
    validate,
];
// USER / COORDINATOR
router.get("/", authenticate, authorizeRoles(Role.USER, Role.COORDINATOR), myWithdrawalListValidation, getMyWithdrawals);
router.post("/", authenticate, authorizeRoles(Role.USER, Role.COORDINATOR), createWithdrawalValidation, createWithdrawal);
// ADMIN - STATIC ROUTES Keep /admin routes before /:withdrawalRequestId
router.get("/admin", authenticate, authorizeRoles(Role.ADMIN), requirePermission("wallet.withdrawal.read"), adminWithdrawalListValidation, getAllWithdrawalsAdmin);
// ADMIN - SPECIFIC ACTIONS
router.patch("/admin/:withdrawalRequestId/approve", authenticate, authorizeRoles(Role.ADMIN), requirePermission("wallet.withdrawal.approve"), approveWithdrawalValidation, approveWithdrawal);
router.patch("/admin/:withdrawalRequestId/processing", authenticate, authorizeRoles(Role.ADMIN), requirePermission("wallet.withdrawal.process"), markProcessingValidation, markWithdrawalProcessing);
router.patch("/admin/:withdrawalRequestId/reject", authenticate, authorizeRoles(Role.ADMIN), requirePermission("wallet.withdrawal.reject"), rejectWithdrawalValidation, rejectWithdrawal);
router.patch("/admin/:withdrawalRequestId/paid", authenticate, authorizeRoles(Role.ADMIN), requirePermission("wallet.withdrawal.complete"), markPaidValidation, markWithdrawalPaid);
// ADMIN - GENERIC ID
router.get("/admin/:withdrawalRequestId", authenticate, authorizeRoles(Role.ADMIN), requirePermission("wallet.withdrawal.read"), withdrawalIdValidation, getWithdrawalByIdAdmin);
// USER / COORDINATOR - SPECIFIC ID ACTIONS
router.patch("/:withdrawalRequestId/cancel", authenticate, authorizeRoles(Role.USER, Role.COORDINATOR), cancelWithdrawalValidation, cancelWithdrawal);
// Keep generic ID route after /:withdrawalRequestId/cancel.
router.get("/:withdrawalRequestId", authenticate, authorizeRoles(Role.USER, Role.COORDINATOR), withdrawalIdValidation, getMyWithdrawalById);
export default router;
//# sourceMappingURL=withdrawal.routes.js.map