import { Schema, model, type Document, Types } from 'mongoose';

export interface IProfile extends Document {
    userId: Types.ObjectId; // Link to the User Document
    fullName?: string;
    phoneNumber?: string;
    email?: string;
    dob?: Date;
    gender?: 'Male' | 'Female' | 'Other',
    referralCode?: string;
    isComplete: boolean;
    referredBy?: Types.ObjectId;
    profileImage?: string;

}

const profileSchema = new Schema<IProfile>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true    // One user = One profile
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
    profileImage: { type: String, default: null },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    referralCode: { type: String, unique: true, sparse: true },
    isComplete: { type: Boolean, default: false },
}, { timestamps: true });

export const Profile = model<IProfile>('Profile', profileSchema)