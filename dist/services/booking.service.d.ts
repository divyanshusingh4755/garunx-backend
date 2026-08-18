import type { Request } from "express";
import { type BookingCategory, type BookingMilestone, type BookingStatus, type IBookingReschedule, type ReassignmentRequestedByRole } from "../models/booking.model.js";
import mongoose, { Types } from "mongoose";
import { Role } from "../types/rbac.js";
type AssignmentAction = "ACCEPT" | "REJECT";
export type CoordinatorBookingView = "REQUESTS" | "BOOKINGS";
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
export interface CoordinatorAvailabilityOptions {
    scheduledAt?: string;
    searchTerm?: string;
}
export declare class BookingService {
    private static getReassignmentManualRequestLimit;
    private static invalidateBookingCache;
    private static assignReplacementCoordinatorRequest;
    private static handleFailedReassignmentAttempt;
    private static clearAcceptedCoordinator;
    private static confirmSuccessfulPayment;
    private static generateOtp;
    private static generateBeneficiaryAccessToken;
    private static hashBeneficiaryAccessToken;
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
        accessibleByUserId?: string;
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
            currentRound: number;
            requests: import("../models/booking.model.js").IAssignmentRequest[];
            pendingReschedule?: {
                previousScheduledAt?: Date;
                requestedScheduledAt: Date;
                reason: string;
                requestedBy: Types.ObjectId;
                requestedAt: Date;
                assignmentRound: number;
            };
            reassignment?: import("../models/booking.model.js").IReassignment;
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
            availabilityStatus: import("../types/enums.js").AvailabilityStatus | undefined;
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
        bookingStatus: "EXPIRED" | "CANCELLED" | "COMPLETED" | "PENDING_PAYMENT" | "CONFIRMED" | "ASSIGNMENT_PENDING" | "ASSIGNED";
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
        paymentStatus: "PARTIAL_REFUND";
        refundedAmount: number;
        totalRefunded: number;
        remainingAmount: number;
        refundId: string;
        providerRefundStatus: string;
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
    static getMyBookingById(bookingId: string, userId: string, role: Role): Promise<{
        notes: string | null;
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
            currentRound: number;
            pendingReschedule?: {
                previousScheduledAt?: Date;
                requestedScheduledAt: Date;
                reason: string;
                requestedBy: Types.ObjectId;
                requestedAt: Date;
                assignmentRound: number;
            };
            reassignment?: import("../models/booking.model.js").IReassignment;
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
        tierSnapshot: import("../models/booking.model.js").IBookingTierSnapshot;
        locationSnapshot: import("../models/booking.model.js").IBookingLocationSnapshot;
        beneficiaryUserId?: Types.ObjectId;
        beneficiaryAccess?: {
            tokenHash: string;
            expiresAt: Date;
            createdAt: Date;
        };
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
            refundReservedAmount?: number;
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
    static getAvailableCoordinators(bookingId: string, userId: string, options?: CoordinatorAvailabilityOptions): Promise<{
        bookingId: Types.ObjectId;
        bookingLocationIds: Types.ObjectId[];
        scheduledAt: Date | null;
        isRescheduleSelection: boolean;
        bookingPreferences: {
            caste: string | undefined;
            gotra: string | undefined;
        };
        selectionConfiguration: {
            matchCaste: boolean;
            matchGotra: boolean;
            minRating: number;
            minCompletedBookings: number;
            autoAssignmentEnabled: boolean | null;
            sortBy: import("../models/coordinator-selection-config.model.js").CoordinatorSortBy;
            sortOrder: import("../models/coordinator-selection-config.model.js").CoordinatorSortOrder;
        };
        requestContext: {
            scheduledAt: string | null;
            isReassignmentSelection: boolean;
            reassignmentRequestedByRole: ReassignmentRequestedByRole | null;
            maxCoordinatorRequests: number | null;
            sentCoordinatorRequests: number | null;
            remainingCoordinatorRequests: number | null;
            automaticFallbackStarted: boolean;
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
        coordinatorId: string;
        assignmentRound: any;
        isReassignmentSelection: boolean;
        requestedByRole: ReassignmentRequestedByRole;
        sentCoordinatorRequests: any;
        maxCoordinatorRequests: number;
        remainingCoordinatorRequests: number;
        message: string;
    } | {
        message: string;
        maxCoordinatorRequests?: number;
        sentCoordinatorRequests?: any;
        bookingId: any;
        bookingReference: any;
        bookingStatus: any;
        assignmentStatus: any;
        coordinatorId: string;
        assignmentRound: any;
        isRescheduleSelection: boolean;
        previousScheduledAt: Date | null;
        scheduledAt: Date;
        responseDeadlineAt: any;
        assignmentExpiresAt: any;
        isReassignmentSelection?: never;
        requestedByRole?: never;
        remainingCoordinatorRequests?: never;
    }>;
    static respondToAssignment(params: {
        bookingId: string;
        coordinatorId: string;
        action: AssignmentAction;
        reason?: string;
    }): Promise<Record<string, any>>;
    static requestReassignment(params: {
        bookingId: string;
        requestedBy: string;
        requestedByRole: ReassignmentRequestedByRole;
        reason: string;
    }): Promise<Record<string, any>>;
    static getCoordinatorBookingList(params: {
        coordinatorId: string;
        view: CoordinatorBookingView;
        status?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        view: CoordinatorBookingView;
        data: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    static processAssignmentTimeouts(): Promise<{
        processed: number;
        expiredRequests: number;
        waitingForSelection: number;
        reassignmentRetry: number;
        reassignmentFailed: number;
    }>;
    static getBookingExecution(params: {
        bookingId: string;
        userId: string;
        role: Role;
    }): Promise<{
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
        bookingId: any;
        bookingStatus: any;
        executionStage: any;
        startedAt: any;
        serviceExecutions: any;
        milestones: any;
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
        bookingId: Types.ObjectId;
        bookingReference: string;
        expiresAt: Date | undefined;
        resendAvailableAt: Date;
        resendCount: number | undefined;
        remainingResends: number;
        otp: string;
    }>;
    static getBookingInvoice(params: {
        bookingId: string;
        requestedBy: string;
        requestedByRole: Role;
    }): Promise<{
        bookingId: Types.ObjectId;
        bookingReference: string;
        bookingStatus: BookingStatus;
        bookedAt: Date;
        scheduledAt: Date | null;
        completedAt: Date | null;
        bookingFor: import("../models/booking.model.js").BookingFor;
        customer: {
            name: string | null;
            email: string | null;
            phone: string | null;
            address: string | null;
        };
        items: import("../models/booking.model.js").IBookingEntry[];
        pricing: {
            baseAmount: number;
            addonAmount: number;
            subtotal: number;
            couponCode: string | null;
            discountAmount: number;
            taxSummary: import("../models/booking.model.js").IBookingTaxSummary;
            grandTotal: number;
        };
        payment: {
            status: import("../models/booking.model.js").PaymentStatus;
            paymentMethod: string | null;
            gateway: string | null;
            amountPaid: number;
            refundAmount: number;
            currency: string;
            paidAt: Date | null;
            refundedAt: Date | null;
            providerOrderId: string | null;
            providerPaymentId: string | null;
        };
    }>;
    static createBeneficiaryAccess(bookingId: string): Promise<{
        bookingId: Types.ObjectId;
        bookingReference: string;
        token: null;
        tokenCreated: boolean;
        beneficiaryUserId: Types.ObjectId | null;
        expiresAt: Date | null;
    } | {
        bookingId: Types.ObjectId;
        bookingReference: string;
        token: string;
        tokenCreated: boolean;
        beneficiaryUserId: Types.ObjectId | null;
        expiresAt: Date;
    } | null>;
    static getBeneficiaryBooking(token: string): Promise<{
        bookingId: Types.ObjectId;
        bookingReference: string;
        status: BookingStatus;
        customerDetails: {
            name?: string;
            email?: string;
            phone?: string;
            address?: string;
            caste?: string;
            gotra?: string;
        };
        entries: import("../models/booking.model.js").IBookingEntry[];
        scheduledAt: Date | null;
        assignment: {
            status: import("../models/booking.model.js").AssignmentStatus | undefined;
            assignedCoordinatorId: Types.ObjectId | null;
        };
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
        } | null;
        createdAt: Date;
        completedAt: Date | null;
    }>;
    static linkBeneficiaryBookingsToUser(userId: string): Promise<{
        linkedCount: number;
    }>;
    static processAutoAssignments(): Promise<{
        processed: number;
        assigned: number;
        reassignmentRequests: number;
        reassignmentFailed: number;
        waitingForUserSelection: number;
        noCoordinatorAvailable: number;
        skipped: number;
    }>;
    static exportBookingsToCsv(bookingIds: string[]): Promise<{
        csv: string;
        total: number;
    }>;
}
export {};
//# sourceMappingURL=booking.service.d.ts.map