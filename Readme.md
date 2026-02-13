ToDo:
1. Create a flow once after user has selected location
2. Create services API next



import { Schema, model, type Document, Types } from 'mongoose';

export interface IBooking extends Document {
    customerId: Types.ObjectId;
    coordinatorId?: Types.ObjectId; // Assigned Sub-Admin
    serviceId?: Types.ObjectId;     // Single ritual
    packageId?: Types.ObjectId;     // Or a bundle
    locationId: Types.ObjectId;      // Where the ritual happens
    
    scheduledDate: Date;
    status: 'PENDING' | 'ASSIGNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
    
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
    basePrice: number;
    discountAmount: number;
    finalPrice: number;
    coordinatorEarnings: number; // The "Empowerment" part
}

const bookingSchema = new Schema<IBooking>({
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coordinatorId: { type: Schema.Types.ObjectId, ref: 'User' },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
    packageId: { type: Schema.Types.ObjectId, ref: 'Package' },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    
    scheduledDate: { type: Date, required: true },
    status: { 
        type: String, 
        enum: ['PENDING', 'ASSIGNED', 'ONGOING', 'COMPLETED', 'CANCELLED'], 
        default: 'PENDING' 
    },
    paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' },
    
    basePrice: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },
    coordinatorEarnings: { type: Number, required: true }
}, { timestamps: true });

export const Booking = model<IBooking>('Booking', bookingSchema);
