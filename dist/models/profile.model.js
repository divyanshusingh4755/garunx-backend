import { Schema, model, Types } from 'mongoose';
const profileSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // One user = One profile
    },
    referredBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    fullName: { type: String, lowercase: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, index: true },
    phoneNumber: { type: String, unique: true, sparse: true, index: true },
    dob: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    referralCode: { type: String, unique: true, sparse: true },
    isComplete: { type: Boolean, default: false },
}, { timestamps: true });
profileSchema.index({ referralCode: 1 });
export const Profile = model('Profile', profileSchema);
//# sourceMappingURL=profile.model.js.map