import { Router } from "express";
import { query } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
import { requirePermission } from "../middleware/rbac.js";
import { validate } from "../utils/validate.js";
import { getMyWallet, getMyWalletTransactions } from "../controllers/wallet.controller.js";
const router = Router();
const walletTransactionListValidation = [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
    query("type").optional().isIn(["BOOKING_REFUND", "COORDINATOR_EARNING", "WITHDRAWAL", "WITHDRAWAL_REVERSAL", "ADMIN_CREDIT", "ADMIN_DEBIT"]).withMessage("Invalid wallet transaction type"),
    query("direction").optional().isIn(["CREDIT", "DEBIT"]).withMessage("direction must be CREDIT or DEBIT"),
    query("sortOrder").optional().isIn(["asc", "desc"]).withMessage("sortOrder must be asc or desc"),
    validate,
];
// USER / COORDINATOR
router.get("/", authenticate, authorizeRoles(Role.USER, Role.COORDINATOR), getMyWallet);
router.get("/transactions", authenticate, authorizeRoles(Role.USER, Role.COORDINATOR), walletTransactionListValidation, getMyWalletTransactions);
export default router;
//# sourceMappingURL=wallet.routes.js.map