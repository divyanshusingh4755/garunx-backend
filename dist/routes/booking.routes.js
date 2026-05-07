import { Router, } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { body, validationResult } from "express-validator";
import { createBooking } from "../controllers/booking.controllers.js";
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
const createBookingValidation = [
    body("items")
        .isArray({ min: 1 })
        .withMessage("At least one item is required"),
    body("items.*.targetId").notEmpty().isString(),
    body("items.*.itemType").isIn(["SERVICE", "PACKAGE"]),
    body("items.*.priceAtBooking").isNumeric(),
    body("customerDetails.name")
        .notEmpty()
        .trim()
        .withMessage("Custoemr name is required"),
    body("customerDetails.phone")
        .isMobilePhone("any")
        .withMessage("Valid phone number is required"),
    body("customerDetails.fullAddress")
        .notEmpty()
        .withMessage("Address is required"),
    body("customerDetails.caste")
        .notEmpty()
        .isString()
        .withMessage("Caste is required"),
    body("customerDetails.gotra")
        .notEmpty()
        .isString()
        .withMessage("Gotra is required"),
    body("scheduledDate")
        .isISO8601()
        .toDate()
        .withMessage("valid scheduled date is required"),
    body("locationId").notEmpty().isString().withMessage("location is required"),
    body("pricing.finalPrice").isNumeric(),
    validate,
];
const statusUpdateValidation = [
    body("status").isIn(["Pending", "Confirmed", "Completed", "Cancelled"]),
    validate,
];
const router = Router();
// router.post("/payments/webhook", handleWebhook);
// router.get("/my-bookings", authenticate, getMyBookings);
router.post("/", authenticate, createBookingValidation, createBooking);
// router.get("/:id", getBookingById);
// router.get("/", authenticate, getAllBookings);
// router.get("/stats", authenticate, getStats);
// router.patch("/:id/assign", authenticate, assignToSubAdmin);
// router.patch("/:id/status", authenticate, statusUpdateValidation, updateStatus);
export default router;
//# sourceMappingURL=booking.routes.js.map