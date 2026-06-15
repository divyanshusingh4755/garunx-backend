import { Document, Model, Types } from "mongoose";
export type CartStatus = "ACTIVE" | "SCHEDULED" | "CHECKOUT_PENDING" | "CHECKED_OUT" | "EXPIRED" | "CANCELLED" | "DELETED";
export interface ISelectedComponentItem {
    itemId: Types.ObjectId;
    name: string;
}
export interface ISelectedComponent {
    componentId: Types.ObjectId;
    name: string;
    items: ISelectedComponentItem[];
    totalPrice: number;
}
export interface IAddonService {
    serviceId: Types.ObjectId;
    name: string;
    price: number;
}
export interface ICart extends Document {
    _id: Types.ObjectId;
    userId?: Types.ObjectId | null;
    serviceId?: Types.ObjectId;
    packageId?: Types.ObjectId;
    name: string;
    thumbnailImage?: string;
    categoryId: Types.ObjectId;
    tierId: Types.ObjectId;
    tierName: string;
    locationId: Types.ObjectId;
    locationName: string;
    customerDetails?: {
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
        caste?: string;
        gotra?: string;
    };
    selectedComponents?: ISelectedComponent[];
    addonComponents?: ISelectedComponent[];
    addonServices?: IAddonService[];
    scheduledDate?: Date;
    scheduledTime?: string;
    notes?: string;
    activeBookingId?: Types.ObjectId;
    basePrice: number;
    addonPrice: number;
    totalAmount: number;
    status: CartStatus;
    createdAt: Date;
    updatedAt: Date;
    checkedOutAt?: Date;
    checkoutExpiresAt?: Date;
    convertedToBookingAt?: Date;
}
export declare const Cart: Model<ICart>;
//# sourceMappingURL=cart.model.d.ts.map