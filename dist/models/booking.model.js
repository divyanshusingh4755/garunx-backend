import { model, Schema } from "mongoose";
import { Role } from "../types/rbac.js";
const bookingSchema = new Schema({
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
export const Booking = model('Booking', bookingSchema);
//# sourceMappingURL=booking.model.js.map