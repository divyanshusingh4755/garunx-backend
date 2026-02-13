import { model, Schema } from "mongoose";
import { Role } from "../types/rbac.js";

export interface IBooking extends Document {
    customerId: Schema.Types.ObjectId;
    subAdminId: Schema.Types.ObjectId;
    serviceId?: Schema.Types.ObjectId[];
    packageId: Schema.Types.ObjectId;
    locationId: Schema.Types.ObjectId;

    // Tracking who initiated the booking
    bookedBy: 'USER' | 'COORDINATOR' | 'ADMIN'

    // Snapshot of customer at time of booking
    customerDetails: {
        name: string;
        phone: string;
        email?: string;
    }

    // Ritual Specifics
    requirements: {
        notes?: string; // e.g: "Need extra flowers"
        attachments?: string[]  // Array of urls for photos of the space or ID proofs
        customInstructions?: string;
    },

    scheduledDate: Date;
    finalPrice: number;
    earnings: number;
    isCustom: boolean;
    status: 'Pending' | 'Completed' | 'Cancelled'
}

const bookingSchema = new Schema<IBooking>({
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subAdminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
    packageId: { type: Schema.Types.ObjectId, ref: 'Package' },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },

    bookedBy: { type: String, enum: Role, required: true },

    customerDetails: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String }
    },

    scheduledDate: { type: Date, required: true },
    finalPrice: { type: Number, required: true },
    earnings: { type: Number, required: true },
    status: { type: String, default: 'Pending' },
}, { timestamps: true });

export const Booking = model<IBooking>('Booking', bookingSchema)