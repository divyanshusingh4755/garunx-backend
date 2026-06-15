import { Types, Document, Model } from "mongoose";
import type { ICart } from "./cart.model.js";
export type BookingStatus = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIAL_REFUND";
export type BookedBy = "CUSTOMER" | "ADMIN" | "SUBADMIN";
export type EntryType = "SERVICE" | "PACKAGE";
export type ComponentType = "DEFAULT" | "ADDON";
export type ServiceRole = "PRIMARY" | "INCLUDED" | "ADDON";
export interface IBookingSelectedItem {
    itemId: Types.ObjectId;
    name: string;
    price: number;
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
export interface IBookingComponent {
    componentType: ComponentType;
    componentId: Types.ObjectId;
    serviceComponentId?: Types.ObjectId;
    name: string;
    description?: string;
    isRequired: boolean;
    isRemovable: boolean;
    isBundled: boolean;
    selected: boolean;
    selectedItems: IBookingSelectedItem[];
    pricing: {
        basePrice: number;
        itemsTotal: number;
        total: number;
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
    subService?: {
        subServiceId: Types.ObjectId;
        name: string;
    };
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
        subtotal: number;
        taxes: number;
        discount: number;
        grandTotal: number;
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
    services: IBookingServiceConfiguration[];
    addonServices: IBookingServiceConfiguration[];
    pricing: {
        subtotal: number;
        taxes: number;
        discount: number;
        grandTotal: number;
    };
}
export interface IBookingEntry {
    entryType: EntryType;
    serviceConfiguration?: IBookingServiceConfiguration;
    packageConfiguration?: IBookingPackageConfiguration;
}
export interface IBooking extends Document {
    userId?: Types.ObjectId;
    subAdminId?: Types.ObjectId;
    cartId: Types.ObjectId;
    bookingReference: string;
    bookedBy: BookedBy;
    entries: IBookingEntry[];
    customerDetails: {
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
        caste?: string;
        gotra?: string;
    };
    pricing: {
        subtotal: number;
        taxes: number;
        discount: number;
        grandTotal: number;
        earnings?: number;
    };
    payment: {
        status: PaymentStatus;
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
        refunds?: IBookingRefund[];
    };
    status: BookingStatus;
    cancellation?: {
        reason?: string;
        cancelledBy?: Types.ObjectId;
        cancelledByRole?: "CUSTOMER" | "ADMIN" | "SUBADMIN" | "SYSTEM";
        cancelledAt?: Date;
    };
    lifecycle?: {
        confirmedBy?: Types.ObjectId;
        completedBy?: Types.ObjectId;
        confirmedAt?: Date;
        completedAt?: Date;
        cancelledAt?: Date;
        expiredAt?: Date;
    };
    scheduledAt?: Date;
    notes?: string;
    cartSnapshot?: Partial<ICart>;
    isDeleted?: boolean;
    createdAt: Date;
    updatedAt: Date;
    paymentExpiresAt?: Date;
}
export declare const Booking: Model<IBooking>;
//# sourceMappingURL=booking.model.d.ts.map