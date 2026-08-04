import { type Document, type Model, Types } from "mongoose";
import type { ILineTax, ITaxSummary } from "../types/tax.types.js";
export type CartStatus = "ACTIVE" | "SCHEDULED" | "CHECKOUT_PENDING" | "CHECKED_OUT" | "EXPIRED" | "CANCELLED" | "DELETED";
export type BookingFor = "MYSELF" | "OTHER";
export interface ICartTaxSummary extends ITaxSummary {
    supplierStateCode?: string;
    placeOfSupplyStateCode?: string;
}
export interface ISelectedComponentItem {
    itemId: Types.ObjectId;
    name: string;
}
export interface ISelectedComponent {
    componentId: Types.ObjectId;
    name: string;
    items: ISelectedComponentItem[];
    priceBeforeDiscount: number;
    discountAmount: number;
    totalPrice: number;
    tax?: ILineTax;
}
export interface ISelectedService {
    serviceId: Types.ObjectId;
    name: string;
    priceBeforeDiscount: number;
    discountAmount: number;
    price: number;
    tax?: ILineTax;
}
export interface IAddonService extends ISelectedService {
}
export interface ICart extends Document {
    _id: Types.ObjectId;
    userId?: Types.ObjectId | null;
    guestId?: string;
    serviceId?: Types.ObjectId;
    packageId?: Types.ObjectId;
    couponId?: Types.ObjectId;
    couponCode?: string;
    name: string;
    thumbnailImage?: string;
    categoryId: Types.ObjectId;
    tierId: Types.ObjectId;
    tierName: string;
    locationId: Types.ObjectId;
    locationName: string;
    bookingFor: BookingFor;
    customerDetails?: {
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
        caste?: string;
        gotra?: string;
    };
    selectedComponents: ISelectedComponent[];
    addonComponents: ISelectedComponent[];
    selectedServices: ISelectedService[];
    addonServices: IAddonService[];
    scheduledAt?: Date;
    schedulingTimezone?: string;
    notes?: string;
    activeBookingId?: Types.ObjectId;
    basePrice: number;
    addonPrice: number;
    subtotal: number;
    discountAmount: number;
    totalAmount: number;
    taxSummary: ICartTaxSummary;
    status: CartStatus;
    createdAt: Date;
    updatedAt: Date;
    checkedOutAt?: Date;
    checkoutExpiresAt?: Date;
    convertedToBookingAt?: Date;
}
export declare const Cart: Model<ICart>;
//# sourceMappingURL=cart.model.d.ts.map