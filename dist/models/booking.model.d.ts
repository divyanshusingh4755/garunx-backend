import { Types, Document, Model } from "mongoose";
type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
type PaymentMethod = "COD" | "RAZORPAY" | "STRIPE" | "UPI" | "CARD" | "NETBANKING";
type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIAL_REFUND";
type BookedBy = "CUSTOMER" | "ADMIN" | "SUBADMIN";
type EntryType = "SERVICE" | "PACKAGE";
type ComponentType = "DEFAULT" | "ADDON";
type ServiceRole = "PRIMARY" | "INCLUDED" | "ADDON";
interface IBookingSelectedItem {
    itemId: Types.ObjectId;
    name: string;
    price?: number;
}
interface IBookingComponent {
    componentType: ComponentType;
    serviceComponentId?: Types.ObjectId;
    componentId: Types.ObjectId;
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
interface IBookingServiceConfiguration {
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
interface IBookingPackageConfiguration {
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
interface IBookingEntry {
    entryType: EntryType;
    entryId: Types.ObjectId;
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
        transactionId?: string;
        paymentMethod?: PaymentMethod;
        gateway?: string;
        amountPaid?: number;
        refundAmount?: number;
        paidAt?: Date;
        refundedAt?: Date;
    };
    status: BookingStatus;
    cancellation?: {
        reason?: string;
        cancelledBy?: Types.ObjectId;
        cancelledByRole?: "CUSTOMER" | "ADMIN" | "SUBADMIN";
        cancelledAt?: Date;
    };
    lifecycle?: {
        confirmedAt?: Date;
        completedAt?: Date;
        cancelledAt?: Date;
    };
    scheduledAt?: Date;
    notes?: string;
    cartSnapshot?: Record<string, unknown>;
    isDeleted?: boolean;
}
export declare const Booking: Model<IBooking>;
export {};
//# sourceMappingURL=booking.model.d.ts.map