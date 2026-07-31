import type { Request } from "express";
import { type BookingCategory, type BookingMilestone, type BookingStatus, type IBookingReschedule, type ReassignmentRequestedByRole } from "../models/booking.model.js";
import mongoose, { Types } from "mongoose";
type AssignmentAction = "ACCEPT" | "REJECT";
export interface CoordinatorFilters {
    matchCaste?: boolean;
    matchGotra?: boolean;
    minRating?: number;
    minCompletedBookings?: number;
    autoAssignmentEnabled?: boolean;
    sortBy?: "rating" | "completedBookings" | "acceptanceRate";
    sortOrder?: "asc" | "desc";
    scheduledAt?: string;
}
export declare class BookingService {
    private static generateOtp;
    private static buildServiceExecutions;
    private static validateBookingOtp;
    private static getBookingLocationIds;
    private static getRequestedCoordinatorIds;
    private static findNextAvailableCoordinator;
    private static assignCoordinatorRequest;
    private static calculateExecutionProgress;
    private static addMilestoneIfMissing;
    static process(req: Request): Promise<void>;
    static retryPayment(bookingId: string, userId: string): Promise<{
        orderId: any;
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
        includeCoordinatorProfile?: boolean;
    }): Promise<{
        data: any[];
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
            taxSummary: import("../models/booking.model.js").IBookingTaxSummary;
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
            status: import("../models/booking.model.js").AssignmentStatus;
            assignedCoordinatorId?: Types.ObjectId;
            assignedBy?: Types.ObjectId;
            assignedAt?: Date;
            assignmentType?: "MANUAL" | "AUTO";
            coordinatorAcceptedAt?: Date;
            responseDeadlineAt?: Date;
            assignmentExpiresAt?: Date;
            requests: import("../models/booking.model.js").IAssignmentRequest[];
            reassignment?: {
                requestedBy: Types.ObjectId;
                requestedByRole: ReassignmentRequestedByRole;
                reason?: string;
                requestedAt: Date;
            };
        } | undefined;
        cancellation: {
            reason?: string;
            cancelledBy?: Types.ObjectId;
            cancelledByRole?: "USER" | "ADMIN" | "SUBADMIN" | "SYSTEM";
            cancelledAt?: Date;
            refundPercentage?: number;
            refundAmount?: number;
        } | undefined;
        execution: {
            stage: import("../models/booking.model.js").BookingExecutionStage;
            startedAt?: Date;
            finishedAt?: Date;
            otpVerification?: {
                status: "PENDING" | "VERIFIED" | "FAILED" | "EXPIRED";
                otpHash?: string;
                expiresAt?: Date;
                generatedAt?: Date;
                verifiedAt?: Date;
                verifiedBy?: Types.ObjectId;
                attempts?: number;
                resendCount?: number;
                lastSentAt?: Date;
            };
            serviceExecutions: import("../models/booking.model.js").IServiceExecution[];
            milestones: import("../models/booking.model.js").IBookingMilestone[];
            progressPercentage?: number;
            completion?: import("../models/booking.model.js").IBookingCompletion;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
    }>;
    static getBookingStats(): Promise<{
        totalBookings: number;
        pendingPaymentBookings: any;
        confirmedBookings: any;
        assignmentPendingBookings: any;
        assignedBookings: any;
        inProgressBookings: any;
        completedBookings: any;
        cancelledBookings: any;
        expiredBookings: any;
        pendingPayments: any;
        processingPayments: any;
        paidPayments: any;
        failedPayments: any;
        refundedPayments: any;
        partialRefundPayments: any;
        totalRevenue: any;
        refundedAmount: any;
        todayBookings: number;
        thisMonthBookings: number;
    }>;
    static searchBookings(searchQuery: string): Promise<(mongoose.Document<unknown, {}, import("../models/booking.model.js").IBooking, {}, mongoose.DefaultSchemaOptions> & import("../models/booking.model.js").IBooking & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    static updateBookingNotes(bookingId: string, notes: string, userId: string): Promise<{
        bookingId: Types.ObjectId;
        notes: string;
    }>;
    static rescheduleBooking(params: {
        bookingId: string;
        scheduledAt: string;
        reason: string;
        userId: string;
        role: string;
    }): Promise<{
        rescheduled: boolean;
        requiresCoordinatorChange: boolean;
        bookingId: Types.ObjectId;
        bookingReference: string;
        bookingStatus: "ASSIGNED";
        currentScheduledAt: Date | undefined;
        requestedScheduledAt: Date;
        reason: string;
        currentCoordinator: {
            coordinatorId: Types.ObjectId;
            fullName: string | undefined;
            profileImage: string | null | undefined;
            userReference: string;
            rating: {
                averageRating: number;
                totalRatings: number;
            };
            experience: {
                totalCompletedBookings: number;
            };
        };
        message: string;
        previousScheduledAt?: never;
        scheduledAt?: never;
        coordinatorId?: never;
        rescheduledAt?: never;
    } | {
        rescheduled: boolean;
        requiresCoordinatorChange: boolean;
        bookingId: Types.ObjectId;
        bookingReference: string;
        previousScheduledAt: Date | undefined;
        scheduledAt: Date;
        bookingStatus: "EXPIRED" | "CANCELLED" | "PENDING_PAYMENT" | "CONFIRMED" | "ASSIGNMENT_PENDING" | "ASSIGNED" | "COMPLETED";
        coordinatorId: Types.ObjectId | null;
        rescheduledAt: Date;
        message: string;
        currentScheduledAt?: never;
        requestedScheduledAt?: never;
        reason?: never;
        currentCoordinator?: never;
    }>;
    static updateBookingStatus(bookingId: string, status: BookingStatus, userId: string, role: string, reason?: string): Promise<{
        bookingId: Types.ObjectId;
        bookingReference: string;
        previousStatus: BookingStatus;
        currentStatus: BookingStatus;
        paymentStatus: import("../models/booking.model.js").PaymentStatus;
        assignmentStatus: import("../models/booking.model.js").AssignmentStatus | undefined;
        executionStage: import("../models/booking.model.js").BookingExecutionStage | undefined;
    }>;
    static refundBooking(bookingId: string, amount: number, reason: string, refundedBy?: string): Promise<{
        bookingId: Types.ObjectId;
        bookingReference: string;
        paymentStatus: "PARTIAL_REFUND" | "REFUNDED";
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
        paymentStatus: import("../models/booking.model.js").PaymentStatus;
        assignmentStatus: import("../models/booking.model.js").AssignmentStatus | undefined;
        executionStage: import("../models/booking.model.js").BookingExecutionStage | undefined;
    }>;
    static getMyBookingById(bookingId: string, userId: string): Promise<{
        assignment: {
            assignedCoordinatorId: any;
            requests: {
                requestId: any;
                status: any;
                assignmentType: any;
                requestedAt: any;
                responseDeadlineAt: any;
                respondedAt: any;
                rejectionReason: any;
                coordinator: {
                    coordinatorId: any;
                    fullName: any;
                    profileImage: any;
                    gender: any;
                    userReference: any;
                    caste: any;
                    gotra: any;
                    rating: {
                        averageRating: any;
                        totalRatings: any;
                    };
                    experience: {
                        totalCompletedBookings: any;
                    };
                    availabilityStatus: any;
                } | null;
            }[];
            status: import("../models/booking.model.js").AssignmentStatus;
            assignedBy?: Types.ObjectId;
            assignedAt?: Date;
            assignmentType?: "MANUAL" | "AUTO";
            coordinatorAcceptedAt?: Date;
            responseDeadlineAt?: Date;
            assignmentExpiresAt?: Date;
            reassignment?: {
                requestedBy: Types.ObjectId;
                requestedByRole: ReassignmentRequestedByRole;
                reason?: string;
                requestedAt: Date;
            };
        } | null;
        coordinator: {
            coordinatorId: any;
            fullName: any;
            profileImage: any;
            gender: any;
            userReference: any;
            caste: any;
            gotra: any;
            rating: {
                averageRating: any;
                totalRatings: any;
            };
            experience: {
                totalCompletedBookings: any;
            };
            availabilityStatus: any;
        } | null;
        userId?: Types.ObjectId;
        cartId: Types.ObjectId;
        bookingReference: string;
        bookedBy: import("../models/booking.model.js").BookedBy;
        entries: import("../models/booking.model.js").IBookingEntry[];
        bookingFor: import("../models/booking.model.js").BookingFor;
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
            taxSummary: import("../models/booking.model.js").IBookingTaxSummary;
            grandTotal: number;
            earnings?: number;
        };
        execution?: {
            stage: import("../models/booking.model.js").BookingExecutionStage;
            startedAt?: Date;
            finishedAt?: Date;
            otpVerification?: {
                status: "PENDING" | "VERIFIED" | "FAILED" | "EXPIRED";
                otpHash?: string;
                expiresAt?: Date;
                generatedAt?: Date;
                verifiedAt?: Date;
                verifiedBy?: Types.ObjectId;
                attempts?: number;
                resendCount?: number;
                lastSentAt?: Date;
            };
            serviceExecutions: import("../models/booking.model.js").IServiceExecution[];
            milestones: import("../models/booking.model.js").IBookingMilestone[];
            progressPercentage?: number;
            completion?: import("../models/booking.model.js").IBookingCompletion;
        };
        payment: {
            status: import("../models/booking.model.js").PaymentStatus;
            paymentMethod?: string;
            gateway?: string;
            amountPaid?: number;
            refundAmount?: number;
            paidAt?: Date;
            refundedAt?: Date;
            currency?: string;
            providerOrderId?: string;
            providerPaymentId?: string;
            paymentSessionId?: string;
            attempts?: number;
            lastAttemptAt?: Date;
            failureReason?: string;
            refunds?: import("../models/booking.model.js").IBookingRefund[];
        };
        status: BookingStatus;
        cancellation?: {
            reason?: string;
            cancelledBy?: Types.ObjectId;
            cancelledByRole?: "USER" | "ADMIN" | "SUBADMIN" | "SYSTEM";
            cancelledAt?: Date;
            refundPercentage?: number;
            refundAmount?: number;
        };
        scheduledAt?: Date;
        rescheduleHistory?: IBookingReschedule[];
        completedAt?: Date;
        notes?: string;
        cartSnapshot?: Partial<import("../models/cart.model.js").ICart>;
        isDeleted?: boolean;
        createdAt: Date;
        updatedAt: Date;
        paymentExpiresAt?: Date;
        _id: Types.ObjectId;
        $locals: Record<string, unknown>;
        $op: "save" | "validate" | "remove" | null;
        $where: Record<string, unknown>;
        baseModelName?: string;
        collection: mongoose.Collection;
        db: mongoose.Connection;
        errors?: mongoose.Error.ValidationError;
        isNew: boolean;
        schema: mongoose.Schema;
        __v: number;
    }>;
    static getMyBookings(params: {
        userId: string;
        status?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: any[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static getBookingCategory(status: BookingStatus): Promise<BookingCategory>;
    static getAvailableCoordinators(bookingId: string, userId: string, filters?: CoordinatorFilters): Promise<{
        bookingId: Types.ObjectId;
        bookingLocationIds: Types.ObjectId[];
        scheduledAt: Date | null;
        isRescheduleSelection: boolean;
        bookingPreferences: {
            caste: string | undefined;
            gotra: string | undefined;
        };
        appliedFilters: {
            matchCaste: boolean;
            matchGotra: boolean;
            minRating: number | null;
            minCompletedBookings: number | null;
            autoAssignmentEnabled: boolean | null;
            sortBy: "acceptanceRate" | "rating" | "completedBookings";
            sortOrder: "asc" | "desc";
            scheduledAt: string | null;
        };
        assignmentStatus: import("../models/booking.model.js").AssignmentStatus | undefined;
        assignmentExpiresAt: Date | undefined;
        total: number;
        coordinators: {
            coordinatorId: Types.ObjectId;
            fullName: string | undefined;
            profileImage: string | null | undefined;
            gender: import("../types/enums.js").Gender | undefined;
            userReference: string;
            caste: import("../types/enums.js").Caste | undefined;
            gotra: import("../types/enums.js").Gotra | undefined;
            rating: {
                averageRating: number;
                totalRatings: number;
            };
            experience: {
                totalCompletedBookings: number;
            };
            availabilityStatus: import("../types/enums.js").AvailabilityStatus | undefined;
        }[];
    }>;
    static selectCoordinator(params: {
        bookingId: string;
        coordinatorId: string;
        selectedBy: string;
        assignmentType: "MANUAL" | "AUTO";
        scheduledAt?: string;
        rescheduleReason?: string;
    }): Promise<{
        bookingId: any;
        bookingReference: any;
        bookingStatus: any;
        assignmentStatus: any;
        coordinatorId: any;
        isRescheduleSelection: boolean;
        previousScheduledAt: Date | null;
        scheduledAt: any;
        responseDeadlineAt: any;
        assignmentExpiresAt: any;
        message: string;
    }>;
    static respondToAssignment(params: {
        bookingId: string;
        coordinatorId: string;
        action: AssignmentAction;
        reason?: string;
    }): Promise<{
        bookingId: Types.ObjectId;
        bookingStatus: "ASSIGNED";
        assignmentStatus: "ACCEPTED";
        coordinatorId: string;
        acceptedAt: Date;
        rejectedCoordinatorId?: never;
        canSelectAnotherCoordinator?: never;
    } | {
        bookingId: Types.ObjectId;
        bookingStatus: "ASSIGNMENT_PENDING";
        assignmentStatus: "PENDING_SELECTION";
        rejectedCoordinatorId: string;
        canSelectAnotherCoordinator: boolean;
        coordinatorId?: never;
        acceptedAt?: never;
    }>;
    static requestReassignment(params: {
        bookingId: string;
        requestedBy: string;
        requestedByRole: ReassignmentRequestedByRole;
        reason: string;
    }): Promise<{
        bookingId: Types.ObjectId;
        bookingStatus: "ASSIGNMENT_PENDING";
        assignmentStatus: "REASSIGNMENT_REQUESTED";
        reassignment: {
            requestedBy: Types.ObjectId;
            requestedByRole: ReassignmentRequestedByRole;
            reason?: string;
            requestedAt: Date;
        };
    }>;
    static getCoordinatorAssignmentRequests(params: {
        coordinatorId: string;
        page?: number;
        limit?: number;
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
    static getCoordinatorBookings(params: {
        coordinatorId: string;
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
    static processAssignmentTimeouts(): Promise<{
        processed: number;
        reassigned: number;
        waitingForSelection: number;
        assignmentExpired: number;
    }>;
    static getBookingExecution(bookingId: string): Promise<{
        bookingId: Types.ObjectId;
        bookingReference: string;
        bookingStatus: BookingStatus;
        scheduledAt: Date | undefined;
        coordinator: Types.ObjectId | undefined;
        assignmentStatus: import("../models/booking.model.js").AssignmentStatus | undefined;
        execution: {
            stage: import("../models/booking.model.js").BookingExecutionStage;
            startedAt?: Date;
            finishedAt?: Date;
            otpVerification?: {
                status: "PENDING" | "VERIFIED" | "FAILED" | "EXPIRED";
                otpHash?: string;
                expiresAt?: Date;
                generatedAt?: Date;
                verifiedAt?: Date;
                verifiedBy?: Types.ObjectId;
                attempts?: number;
                resendCount?: number;
                lastSentAt?: Date;
            };
            serviceExecutions: import("../models/booking.model.js").IServiceExecution[];
            milestones: import("../models/booking.model.js").IBookingMilestone[];
            progressPercentage?: number;
            completion?: import("../models/booking.model.js").IBookingCompletion;
        };
        completedAt: Date | undefined;
    }>;
    static markCoordinatorArrived(params: {
        bookingId: string;
        coordinatorId: string;
    }): Promise<{
        bookingId: Types.ObjectId;
        bookingStatus: "IN_PROGRESS";
        executionStage: "CUSTOMER_VERIFICATION_PENDING";
        startedAt: Date;
        serviceExecutions: import("../models/booking.model.js").IServiceExecution[];
        milestones: import("../models/booking.model.js").IBookingMilestone[];
    }>;
    static verifyBookingOtp(params: {
        bookingId: string;
        otp: string;
        verifiedBy: string;
    }): Promise<{
        bookingId: Types.ObjectId;
        otpStatus: "VERIFIED";
        executionStage: "SERVICE_EXECUTION";
        verifiedAt: Date;
    }>;
    static startBookingService(params: {
        bookingId: string;
        executionId: string;
        startedBy: string;
    }): Promise<{
        bookingId: Types.ObjectId;
        executionId: string;
        serviceId: Types.ObjectId;
        status: "IN_PROGRESS";
        startedAt: Date;
    }>;
    static completeBookingService(params: {
        bookingId: string;
        executionId: string;
        completedBy: string;
        notes?: string;
    }): Promise<{
        bookingId: Types.ObjectId;
        executionId: string;
        serviceId: Types.ObjectId;
        serviceStatus: "COMPLETED";
        progressPercentage: number;
        executionStage: import("../models/booking.model.js").BookingExecutionStage;
        allServicesResolved: boolean;
    }>;
    static skipBookingService(params: {
        bookingId: string;
        executionId: string;
        skippedBy: string;
        reason: string;
    }): Promise<{
        bookingId: Types.ObjectId;
        executionId: string;
        serviceStatus: "SKIPPED";
        progressPercentage: number;
        executionStage: import("../models/booking.model.js").BookingExecutionStage;
        allServicesResolved: boolean;
    }>;
    static addBookingMilestone(params: {
        bookingId: string;
        code: BookingMilestone;
        notes?: string;
        completedBy: string;
    }): Promise<{
        bookingId: Types.ObjectId;
        code: BookingMilestone;
        executionStage: import("../models/booking.model.js").BookingExecutionStage;
        milestones: import("../models/booking.model.js").IBookingMilestone[];
    }>;
    static completeBookingExecution(params: {
        bookingId: string;
        completedBy: string;
        notes?: string;
        proofUrls: string[];
    }): Promise<{
        bookingId: Types.ObjectId;
        bookingReference: string;
        bookingStatus: "COMPLETED";
        executionStage: "FINISHED";
        progressPercentage: number;
        completion: import("../models/booking.model.js").IBookingCompletion;
        completedAt: Date;
    }>;
    static generateBookingOtp(params: {
        bookingId: string;
        coordinatorId: string;
    }): Promise<{
        otp?: string;
        bookingId: Types.ObjectId;
        bookingReference: string;
        expiresAt: Date | undefined;
        resendAvailableAt: Date;
        resendCount: number | undefined;
        remainingResends: number;
    }>;
}
export {};
//# sourceMappingURL=booking.service.d.ts.map