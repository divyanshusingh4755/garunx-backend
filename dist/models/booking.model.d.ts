import { Types, Document, Model } from "mongoose";
import type { ICart } from "./cart.model.js";
import type { ILineTax, ITaxSummary } from "../types/tax.types.js";
export type RescheduledByRole = "USER" | "ADMIN" | "SUBADMIN";
export type ReassignmentStatus = "PENDING_REPLACEMENT" | "REPLACEMENT_REQUESTED" | "COMPLETED" | "FAILED";
export type ReassignmentMode = "AUTO" | "NOMINATED";
export type BookingStatus = "PENDING_PAYMENT" | "CONFIRMED" | "ASSIGNMENT_PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "EXPIRED";
export type BookingFor = "MYSELF" | "OTHER";
export type PaymentStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "PARTIAL_REFUND" | "REFUNDED";
export type AssignmentStatus = "NOT_STARTED" | "PENDING_SELECTION" | "PENDING_RESPONSE" | "ACCEPTED" | "REJECTED" | "REASSIGNMENT_REQUESTED";
export type BookingCategory = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED" | "PAYMENT_PENDING" | "EXPIRED";
export type BookingExecutionStage = "NOT_STARTED" | "COORDINATOR_ARRIVED" | "CUSTOMER_VERIFICATION_PENDING" | "SERVICE_EXECUTION" | "FINALIZATION" | "FINISHED";
export type BookingMilestone = "COORDINATOR_ARRIVED" | "OTP_VERIFIED" | "SERVICE_STARTED" | "CUSTOMER_DETAILS_VERIFIED" | "DOCUMENTS_COLLECTED" | "FAMILY_TREE_STARTED" | "FAMILY_TREE_COMPLETED" | "ALL_SERVICES_COMPLETED" | "FINAL_REPORT_GENERATED";
export type AssignmentRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "SUPERSEDED" | "CANCELLED";
export type AssignmentRequestClosureReason = "ANOTHER_COORDINATOR_ACCEPTED" | "REASSIGNMENT_STARTED" | "REASSIGNMENT_COMPLETED" | "RESCHEDULE_COORDINATOR_CHANGE" | "USER_CANCELLED" | "SYSTEM_CANCELLED";
export type ReassignmentRequestedByRole = "USER" | "ADMIN" | "COORDINATOR" | "SYSTEM";
export interface IAssignmentRequest {
    _id?: Types.ObjectId;
    coordinatorId: Types.ObjectId;
    status: AssignmentRequestStatus;
    assignmentRound: number;
    closureReason?: AssignmentRequestClosureReason;
    assignmentType: "MANUAL" | "AUTO";
    requestedBy?: Types.ObjectId;
    requestedAt: Date;
    responseDeadlineAt: Date;
    scheduledAt: Date;
    respondedAt?: Date;
    rejectionReason?: string;
}
export type BookedBy = "USER" | "ADMIN" | "SUBADMIN";
export type EntryType = "SERVICE" | "PACKAGE";
export type ComponentType = "DEFAULT" | "ADDON";
export type ServiceRole = "PRIMARY" | "INCLUDED" | "ADDON";
export type CoordinatorSettlementStatus = "NOT_PAYABLE" | "PAYABLE" | "PAID" | "REVERSED";
export interface ICoordinatorSettlement {
    status: CoordinatorSettlementStatus;
    coordinatorId?: Types.ObjectId;
    payableAmount: number;
    paidAmount: number;
    payableAt?: Date;
    paidAt?: Date;
    paymentReference?: string;
}
export interface IBookingTierSnapshot {
    tierId: Types.ObjectId;
    name: string;
}
export interface IBookingLocationSnapshot {
    locationId: Types.ObjectId;
    name: string;
}
export interface IBookingReschedule {
    previousScheduledAt?: Date;
    newScheduledAt: Date;
    reason: string;
    rescheduledBy: Types.ObjectId;
    rescheduledByRole: RescheduledByRole;
    rescheduledAt: Date;
}
export interface IBookingCompletion {
    notes?: string;
    proofUrls: string[];
    completedBy: Types.ObjectId;
    completedAt: Date;
}
export interface IBookingMilestone {
    code: BookingMilestone;
    completedAt: Date;
    completedBy?: Types.ObjectId;
    notes?: string;
}
export interface IBookingSelectedItem {
    itemId: Types.ObjectId;
    name: string;
}
export interface IBookingRefund {
    refundId: string;
    amount: number;
    reason: string;
    refundedAt: Date;
    providerRefundId?: string;
    status?: "PENDING" | "SUCCESS" | "FAILED";
    refundedBy?: Types.ObjectId;
}
export type ServiceExecutionStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "CANCELLED";
export interface IServiceExecution {
    executionId: string;
    serviceId: Types.ObjectId;
    status: ServiceExecutionStatus;
    startedAt?: Date;
    completedAt?: Date;
    completedBy?: Types.ObjectId;
    notes?: string;
}
export interface IBookingTaxSummary extends ITaxSummary {
    supplierStateCode?: string;
    placeOfSupplyStateCode?: string;
}
export interface IPendingReschedule {
    previousScheduledAt?: Date;
    requestedScheduledAt: Date;
    reason: string;
    requestedBy: Types.ObjectId;
    requestedAt: Date;
    assignmentRound: number;
}
export interface IBookingSubService {
    subServiceId: Types.ObjectId;
    name: string;
    description: string;
    image?: string;
}
export interface IBookingComponent {
    componentType: ComponentType;
    componentId: Types.ObjectId;
    serviceComponentId?: Types.ObjectId;
    name: string;
    description?: string;
    imageUrl?: string;
    isRequired: boolean;
    isRemovable: boolean;
    isBundled: boolean;
    selected: boolean;
    selectedItems: IBookingSelectedItem[];
    pricing: {
        priceBeforeDiscount: number;
        discountAmount: number;
        finalAmount: number;
        tax?: ILineTax;
    };
}
export interface IBookingServiceConfiguration {
    serviceId: Types.ObjectId;
    serviceSnapshot: {
        name: string;
        shortDescription?: string;
        thumbnailImage?: string;
        serviceReference?: string;
    };
    serviceRole: ServiceRole;
    subServices: IBookingSubService[];
    tier: {
        tierId: Types.ObjectId;
        name: string;
    };
    location: {
        locationId: Types.ObjectId;
        name: string;
    };
    components: IBookingComponent[];
    pricing: {
        priceBeforeDiscount: number;
        discountAmount: number;
        finalAmount: number;
        commissionPercentage: number;
        commissionAmount: number;
        tax?: ILineTax;
        taxSummary: IBookingTaxSummary;
    };
}
export interface IBookingPackageConfiguration {
    packageId: Types.ObjectId;
    packageSnapshot: {
        name: string;
        shortDescription?: string;
        thumbnailImage?: string;
        packageReference?: string;
    };
    selectedServices: IBookingServiceConfiguration[];
    addonServices: IBookingServiceConfiguration[];
    pricing: {
        baseAmount: number;
        addonAmount: number;
        subtotal: number;
        discountAmount: number;
        commissionPercentage: number;
        commissionBaseAmount: number;
        commissionAmount: number;
        coordinatorPayableAmount: number;
        taxSummary: IBookingTaxSummary;
        grandTotal: number;
    };
}
export interface IReassignment {
    requestedBy: Types.ObjectId;
    requestedByRole: ReassignmentRequestedByRole;
    reason: string;
    requestedAt: Date;
    previousCoordinatorId: Types.ObjectId;
    replacementCoordinatorId?: Types.ObjectId;
    assignmentRound: number;
    mode: "AUTO" | "NOMINATED";
    status: "PENDING_REPLACEMENT" | "REPLACEMENT_REQUESTED" | "COMPLETED" | "FAILED";
    completedAt?: Date;
    failedAt?: Date;
    failureReason?: string;
}
export interface IBookingEntry {
    entryType: EntryType;
    serviceConfiguration?: IBookingServiceConfiguration;
    packageConfiguration?: IBookingPackageConfiguration;
}
export interface IBooking extends Document {
    userId?: Types.ObjectId;
    cartId: Types.ObjectId;
    bookingReference: string;
    bookedBy: BookedBy;
    entries: IBookingEntry[];
    bookingFor: BookingFor;
    tierSnapshot: IBookingTierSnapshot;
    locationSnapshot: IBookingLocationSnapshot;
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
        commissionPercentage: number;
        commissionBaseAmount: number;
        commissionAmount: number;
        coordinatorPayableAmount: number;
        taxSummary: IBookingTaxSummary;
        grandTotal: number;
    };
    execution?: {
        stage: BookingExecutionStage;
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
        serviceExecutions: IServiceExecution[];
        milestones: IBookingMilestone[];
        progressPercentage?: number;
        completion?: IBookingCompletion;
    };
    payment: {
        status: PaymentStatus;
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
        refunds?: IBookingRefund[];
    };
    status: BookingStatus;
    cancellation?: {
        reason?: string;
        cancelledBy?: Types.ObjectId;
        cancelledByRole?: "USER" | "ADMIN" | "COORDINATOR" | "SYSTEM";
        cancelledAt?: Date;
        refundPercentage?: number;
        refundAmount?: number;
    };
    assignment?: {
        status: AssignmentStatus;
        assignedCoordinatorId?: Types.ObjectId;
        assignedBy?: Types.ObjectId;
        assignedAt?: Date;
        assignmentType?: "MANUAL" | "AUTO";
        coordinatorAcceptedAt?: Date;
        responseDeadlineAt?: Date;
        assignmentExpiresAt?: Date;
        currentRound: number;
        requests: IAssignmentRequest[];
        pendingReschedule?: {
            previousScheduledAt?: Date;
            requestedScheduledAt: Date;
            reason: string;
            requestedBy: Types.ObjectId;
            requestedAt: Date;
            assignmentRound: number;
        };
        reassignment?: IReassignment;
    };
    scheduledAt?: Date;
    rescheduleHistory?: IBookingReschedule[];
    completedAt?: Date;
    notes?: string;
    cartSnapshot?: Partial<ICart>;
    isDeleted?: boolean;
    createdAt: Date;
    updatedAt: Date;
    paymentExpiresAt?: Date;
    coordinatorSettlement: ICoordinatorSettlement;
}
export declare const Booking: Model<IBooking>;
//# sourceMappingURL=booking.model.d.ts.map