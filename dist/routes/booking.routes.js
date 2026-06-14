import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { paymentStatus, retryPayment, } from "../controllers/booking.controllers.js";
const router = Router();
router.get("/:cartId/payment-status", authenticate, paymentStatus);
router.post("/:bookingId/retry-payment", authenticate, retryPayment);
export default router;
//# sourceMappingURL=booking.routes.js.map