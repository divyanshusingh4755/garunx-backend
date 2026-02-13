import { Schema } from "mongoose";
export interface IBooking extends Document {
    customerId: Schema.Types.ObjectId;
    subAdminId: Schema.Types.ObjectId;
    serviceId?: Schema.Types.ObjectId[];
    packageId: Schema.Types.ObjectId;
    locationId: Schema.Types.ObjectId;
    bookedBy: 'USER' | 'COORDINATOR' | 'ADMIN';
    customerDetails: {
        name: string;
        phone: string;
        email?: string;
    };
    requirements: {
        notes?: string;
        attachments?: string[];
        customInstructions?: string;
    };
    scheduledDate: Date;
    finalPrice: number;
    earnings: number;
    isCustom: boolean;
    status: 'Pending' | 'Completed' | 'Cancelled';
}
export declare const Booking: import("mongoose").Model<IBooking, {}, {}, {}, import("mongoose").Document<unknown, {}, IBooking, {}, import("mongoose").DefaultSchemaOptions> & IBooking & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IBooking>;
//# sourceMappingURL=booking.model.d.ts.map