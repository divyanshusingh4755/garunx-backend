import { Schema } from "mongoose";
import { Role } from "../types/rbac.js";
const bookingStatusHistorySchema = new Schema({
    bookingId: {
        type: Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
        index: true,
    },
    fromStatus: {
        type: String,
        enum: ["PENDING_PAYMENT", "CONFIRMED", "PENDING_COORDINATOR_SELECTION", "PENDING_COORDINATOR_RESPONSE", "ASSIGNED", "REASSIGNMENT_REQUESTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REFUNDED"],
    },
    toStatus: {
        type: String,
        enum: ["PENDING_PAYMENT", "CONFIRMED", "PENDING_COORDINATOR_SELECTION", "PENDING_COORDINATOR_RESPONSE", "ASSIGNED", "REASSIGNMENT_REQUESTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REFUNDED"],
        required: true,
    },
    eventType: {
        type: String,
        enum: [
            "BOOKING_CREATED",
            "PAYMENT_COMPLETED",
            "PAYMENT_FAILED",
            "BOOKING_CONFIRMED",
            "COORDINATOR_REQUEST_SENT",
            "COORDINATOR_ACCEPTED",
            "COORDINATOR_DECLINED",
            "AUTO_ASSIGNED",
            "MANUALLY_ASSIGNED",
            "REASSIGNED",
            "RESCHEDULED",
            "BOOKING_STARTED",
            "BOOKING_COMPLETED",
            "BOOKING_CANCELLED",
            "REFUND_INITIATED",
            "REFUND_COMPLETED",
        ],
        required: true,
    },
    changedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    changedByRole: {
        type: String,
        enum: Object.values(Role)
    },
    remarks: {
        type: String,
        trim: true,
        maxLength: 1000,
    },
    metadata: {
        coordinatorId: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        paymentId: String,
        refundAmount: Number,
        previousScheduledDate: Date,
        newScheduledDate: Date,
    }
}, {
    timestamps: {
        createdAt: true,
        updatedAt: false,
    },
});
bookingStatusHistorySchema.index({
    bookingId: 1,
    createdAt: -1,
});
bookingStatusHistorySchema.index({
    eventType: 1,
});
bookingStatusHistorySchema.index({
    changedBy: 1,
});
//# sourceMappingURL=bookingstatushistory.model.js.map