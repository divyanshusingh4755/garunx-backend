import { Types, Document } from "mongoose";
export interface IBooking extends Document {
    customerId: Types.ObjectId;
    subAdminId?: Types.ObjectId;
    items: {
        targetId: Types.ObjectId;
        productName: string;
        itemType: "SERVICE" | "PACKAGE";
        description?: string;
        imageUrl?: string;
        categoryName?: string;
        priceAtBooking: number;
        selectedVariants: {
            variantId: Types.ObjectId;
            tier: string;
            price: number;
            location: string;
        }[];
    };
    location: string;
    bookedBy: string;
    customerDetails: {
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
        caste?: string;
        gotra?: string;
    };
    scheduledDate: Date;
    notes?: string;
    pricing: {
        basePrice: number;
        discount: number;
        finalPrice: number;
        earnings: number;
    };
    status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
    paymentStatus: "Pending" | "Paid" | "Refunded";
    transactionId?: string;
    bookingReference: string;
}
export declare const Booking: import("mongoose").Model<IBooking, {}, {}, {}, Document<unknown, {}, IBooking, {}, import("mongoose").DefaultSchemaOptions> & IBooking & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IBooking>;
//# sourceMappingURL=booking.model.d.ts.map