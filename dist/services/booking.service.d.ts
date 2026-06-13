import type { Request } from "express";
import mongoose from "mongoose";
export declare class BookingService {
    static process(req: Request): Promise<void>;
    static retryPayment(bookingId: string, userId: string): Promise<{
        paymentSessionId: any;
    }>;
    static getPaymentStatus(cartId: string, userId: string): Promise<{
        hasPendingPayment: boolean;
        paymentStatus: null;
        bookingStatus: null;
        bookingId?: never;
        bookingReference?: never;
        cashfreeOrderStatus?: never;
        totalAmount?: never;
        canRetry?: never;
        paymentSessionId?: never;
    } | {
        hasPendingPayment: boolean;
        bookingId: mongoose.Types.ObjectId;
        bookingReference: string;
        bookingStatus: import("../models/booking.model.js").BookingStatus;
        paymentStatus: import("../models/booking.model.js").PaymentStatus;
        cashfreeOrderStatus: any;
        totalAmount: number;
        canRetry: boolean;
        paymentSessionId: string | undefined;
    }>;
}
//# sourceMappingURL=booking.service.d.ts.map