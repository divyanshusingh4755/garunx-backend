import { model, Schema } from "mongoose";
const otpSchema = new Schema({
    phoneNumber: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // Autmatically deletes after 5 minuts (300 seconds)
    }
});
export const Otp = model('Otp', otpSchema);
//# sourceMappingURL=otp.model.js.map