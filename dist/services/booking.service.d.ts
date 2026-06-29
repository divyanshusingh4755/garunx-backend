import type { Request } from "express";
import { type BookingStatus } from "../models/booking.model.js";
import mongoose, { Types } from "mongoose";
export declare class BookingService {
    static process(req: Request): Promise<void>;
    static retryPayment(bookingId: string, userId: string): Promise<{
        orderId: string;
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
        bookingId: Types.ObjectId;
        bookingReference: string;
        bookingStatus: BookingStatus;
        paymentStatus: import("../models/booking.model.js").PaymentStatus;
        cashfreeOrderStatus: any;
        totalAmount: number;
        canRetry: boolean;
        paymentSessionId: string | undefined;
    }>;
    static findBookings(params: {
        searchTerm?: string;
        status?: string;
        paymentStatus?: string;
        userId?: string;
        bookingReference?: string;
        fromDate?: string;
        toDate?: string;
        limit?: number;
        page?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: (import("../models/booking.model.js").IBooking & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static getBookingById(bookingId: string): Promise<{
        bookingId: Types.ObjectId;
        bookingReference: string;
        status: BookingStatus;
        bookedBy: import("../models/booking.model.js").BookedBy;
        customerDetails: {
            name?: string;
            email?: string;
            phone?: string;
            address?: string;
            caste?: string;
            gotra?: string;
        };
        pricing: {
            baseAmount: number;
            addonAmount: number;
            subtotal: number;
            couponId?: Types.ObjectId;
            couponCode?: string;
            discountAmount: number;
            taxes: number;
            grandTotal: number;
            earnings?: number;
        };
        payment: {
            status: import("../models/booking.model.js").PaymentStatus;
            method: string | undefined;
            gateway: string | undefined;
            amountPaid: number | undefined;
            currency: string | undefined;
            providerOrderId: string | undefined;
            providerPaymentId: string | undefined;
            paymentSessionId: string | undefined;
            paidAt: Date | undefined;
            failureReason: string | undefined;
        };
        entries: import("../models/booking.model.js").IBookingEntry[];
        scheduledAt: Date | undefined;
        notes: string | undefined;
        assignment: {
            assignedCoordinatorId?: Types.ObjectId;
            assignedBy?: Types.ObjectId;
            assignedAt?: Date;
            assignmentType?: "MANUAL" | "AUTO";
            coordinatorAcceptedAt?: Date;
            responseDeadlineAt?: Date;
        } | undefined;
        cancellation: {
            reason?: string;
            cancelledBy?: Types.ObjectId;
            cancelledByRole?: "CUSTOMER" | "ADMIN" | "SUBADMIN" | "SYSTEM";
            cancelledAt?: Date;
            refundPercentage: number;
            refundAmount: number;
        } | undefined;
        rescheduleHistory: {
            oldDate: Date;
            newDate: Date;
            reason: string;
            rescheduledBy: Types.ObjectId;
            createdAt: Date;
        }[];
        reassignmentHistory: {
            oldCoordinatorId: Types.ObjectId;
            newCoordinatorId: Types.ObjectId;
            reason: string;
            reassignedBy: Types.ObjectId;
            createdAt: Date;
        }[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    static getBookingStats(): Promise<{
        totalBookings: number;
        pendingPaymentBookings: any;
        confirmedBookings: any;
        pendingCoordinatorSelectionBookings: any;
        pendingCoordinatorResponseBookings: any;
        assignedBookings: any;
        reassignmentRequestedBookings: any;
        inProgressBookings: any;
        completedBookings: any;
        cancelledBookings: any;
        refundedBookings: any;
        pendingPayments: any;
        paidPayments: any;
        failedPayments: any;
        refundedPayments: any;
        partialRefundPayments: any;
        totalRevenue: any;
        refundedAmount: any;
        todayBookings: number;
        thisMonthBookings: number;
    }>;
    static updateBookingNotes(bookingId: string, notes: string): Promise<{
        bookingId: Types.ObjectId;
        notes: string;
    }>;
    static updateBookingSchedule(bookingId: string, scheduledAt: string, userId: string, role: string): Promise<{
        bookingId: Types.ObjectId;
        scheduledAt: Date;
    }>;
    static updateBookingStatus(bookingId: string, status: BookingStatus, userId: string, role: string, reason?: string): Promise<{
        bookingId: Types.ObjectId;
        bookingReference: string;
        previousStatus: BookingStatus;
        currentStatus: BookingStatus;
    }>;
    static refundBooking(bookingId: string, amount: number, reason: string, refundedBy?: string): Promise<{
        bookingId: Types.ObjectId;
        bookingReference: string;
        paymentStatus: "REFUNDED" | "PARTIAL_REFUND";
        refundedAmount: number;
        totalRefunded: number;
        remainingAmount: number;
    }>;
    static expirePendingPayments(): Promise<{
        expiredBookings: number;
        releasedCarts: number;
    }>;
    static cancelBooking(bookingId: string, userId: string, role: string, reason: string): Promise<{
        bookingId: Types.ObjectId;
        bookingReference: string;
        previousStatus: BookingStatus;
        currentStatus: BookingStatus;
    }>;
    static getMyBookingById(bookingId: string, userId: string): Promise<mongoose.Document<unknown, {}, import("../models/booking.model.js").IBooking, {}, mongoose.DefaultSchemaOptions> & import("../models/booking.model.js").IBooking & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getMyBookings(params: {
        userId: string;
        status?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: (import("../models/booking.model.js").IBooking & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
//# sourceMappingURL=booking.service.d.ts.map