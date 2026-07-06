import { Schema, Types, model, Document } from "mongoose";
import { Role } from "../types/rbac.js";
import { Counter } from "./counter.model.js";
import { ApprovalStatus, AvailabilityStatus, Caste, Gender, Gotra, VerificationStatus } from "../types/enums.js";
const documentVerificationSchema = new Schema({
    aadharCard: String,
    panCard: String,
    status: {
        type: String,
        enum: Object.values(VerificationStatus),
        default: VerificationStatus.PENDING,
    },
    rejectionReason: String,
}, {
    _id: false,
});
const bankVerificationSchema = new Schema({
    bankPassbook: String,
    accountNumber: String,
    accountName: String,
    bankName: String,
    ifscCode: String,
    status: {
        type: String,
        enum: Object.values(VerificationStatus),
        default: VerificationStatus.PENDING,
    },
    rejectionReason: String,
}, {
    _id: false,
});
const serviceableLocationSchema = new Schema({
    locationId: {
        type: Schema.Types.ObjectId,
        ref: "Location",
        required: true,
    },
    caste: [
        {
            type: String,
            enum: Object.values(Caste),
        },
    ],
    gotra: [
        {
            type: String,
            enum: Object.values(Gotra),
        },
    ],
}, {
    _id: false,
});
const coordinatorProfileSchema = new Schema({
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
    },
    totalRatings: {
        type: Number,
        default: 0,
        min: 0,
    },
    ratingSum: {
        type: Number,
        default: 0,
        min: 0,
    },
    totalCompletedBookings: {
        type: Number,
        default: 0,
    },
    totalAssignedBookings: {
        type: Number,
        default: 0,
    },
    acceptanceRate: {
        type: Number,
        default: 0,
    },
    approvalStatus: {
        type: String,
        enum: Object.values(ApprovalStatus),
        default: ApprovalStatus.PENDING,
    },
    availabilityStatus: {
        type: String,
        enum: Object.values(AvailabilityStatus),
        default: AvailabilityStatus.AVAILABLE,
    },
    maxDailyBookings: {
        type: Number,
        default: 5,
        min: 1,
    },
    autoAssignmentEnabled: {
        type: Boolean,
        default: true,
    },
    lastAvailabilityChangedAt: Date,
    serviceableLocations: {
        type: [serviceableLocationSchema],
        default: [],
    },
}, {
    _id: false,
});
const userSchema = new Schema({
    phoneNumber: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    password: { type: String },
    role: {
        type: String,
        enum: Object.values(Role),
        required: true,
        default: Role.USER,
    },
    otp: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    isOtpVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    fullName: { type: String, trim: true },
    dob: { type: Date },
    gender: { type: String, enum: Object.values(Gender) },
    profileImage: { type: String, default: null },
    isComplete: { type: Boolean, default: false },
    isResetVerified: { type: Boolean, default: false },
    referralCode: { type: String },
    referredBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    savedLocations: [{ type: String }],
    documentVerification: {
        type: documentVerificationSchema,
        default: {},
    },
    bankDocumentVerification: {
        type: bankVerificationSchema,
        default: {},
    },
    caste: {
        index: true,
        type: String,
        enum: Object.values(Caste),
    },
    gotra: {
        index: true,
        type: String,
        enum: Object.values(Gotra),
    },
    isDocumentVerified: { type: Boolean, default: false },
    isBankDocumentVerified: { type: Boolean, default: false },
    userReference: {
        type: String,
        unique: true,
        index: true,
    },
    coordinatorProfile: {
        type: coordinatorProfileSchema,
        default: undefined,
    },
}, { timestamps: true });
userSchema.pre("save", async function () {
    if (!this.isNew)
        return;
    try {
        const counter = await Counter.findOneAndUpdate({ id: "userId" }, { $inc: { seq: 1 } }, { new: true, upsert: true });
        if (counter) {
            const seqString = counter.seq.toString().padStart(4, "0");
            this.userReference = `GX-${seqString}`;
        }
    }
    catch (error) {
        throw error;
    }
});
// Allow same phone/email across DIFFERENT roles
userSchema.index({ email: 1, role: 1 }, {
    unique: true,
    partialFilterExpression: { email: { $type: "string" } },
});
userSchema.index({ phoneNumber: 1, role: 1 }, {
    unique: true,
    partialFilterExpression: { phoneNumber: { $type: "string" } },
});
userSchema.index({ referralCode: 1 }, { unique: true, sparse: true });
// Cleanup unverified users after 24 hours
userSchema.index({ createdAt: 1 }, {
    expireAfterSeconds: 86400,
    partialFilterExpression: { isOtpVerified: false },
});
userSchema.index({ fullName: 1 });
userSchema.index({ email: 1 });
userSchema.index({ phoneNumber: 1 });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({
    role: 1,
    isActive: 1,
    isDocumentVerified: 1,
    isBankDocumentVerified: 1,
    "coordinatorProfile.approvalStatus": 1,
    "coordinatorProfile.availabilityStatus": 1,
});
userSchema.index({
    role: 1,
    "coordinatorProfile.averageRating": -1,
});
userSchema.index({
    role: 1,
    "coordinatorProfile.serviceableLocations.locationId": 1
});
userSchema.index({
    fullName: "text",
    email: "text",
    phoneNumber: "text",
    userReference: "text",
}, {
    weights: {
        fullName: 10,
        email: 5,
        phoneNumber: 2,
        userReference: 1,
    },
    name: "UserSearchIndex",
});
export const User = model("User", userSchema);
//# sourceMappingURL=user.model.js.map