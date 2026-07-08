import { type Types } from "mongoose";
import type { BookingStatus } from "./booking.model.js";
import { Role } from "../types/rbac.js";
export interface IBookingStatusHistory extends Document {
    bookingId: Types.ObjectId;
    fromStatus?: BookingStatus;
    toStatus: BookingStatus;
    eventType: "BOOKING_CREATED" | "PAYMENT_COMPLETED" | "PAYMENT_FAILED" | "BOOKING_CONFIRMED" | "COORDINATOR_REQUEST_SENT" | "COORDINATOR_ACCEPTED" | "COORDINATOR_DECLINED" | "AUTO_ASSIGNED" | "MANUALLY_ASSIGNED" | "REASSIGNED" | "RESCHEDULED" | "BOOKING_STARTED" | "BOOKING_COMPLETED" | "BOOKING_CANCELLED" | "REFUND_INITIATED" | "REFUND_COMPLETED";
    changedBy?: Types.ObjectId;
    changedByRole?: Role;
    remarks?: string;
    metadata?: {
        coordinatorId?: Types.ObjectId;
        paymentId?: string;
        refundAmount?: number;
        previousScheduledDate?: Date;
        newScheduledDate?: Date;
    };
    createdAt: Date;
}
//# sourceMappingURL=bookingstatushistory.model.d.ts.map