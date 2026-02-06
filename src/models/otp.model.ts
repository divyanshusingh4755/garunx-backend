import { model, Schema } from "mongoose";

export interface IOTP extends Document {
    phoneNumber: string;
    otp: string;
    createdAt: Date;
}

const otpSchema = new Schema<IOTP>({
    phoneNumber: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300    // Autmatically deletes after 5 minuts (300 seconds)
    }
})

export const Otp = model<IOTP>('Otp', otpSchema);