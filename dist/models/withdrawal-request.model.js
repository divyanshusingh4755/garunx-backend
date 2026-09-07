import { model, Schema } from "mongoose";
import { Role } from "../types/rbac.js";
const withdrawalDestinationSnapshotSchema = new Schema({
    type: {
        type: String,
        enum: ["BANK", "UPI"],
        required: true
    },
    accountHolderName: {
        type: String,
        trim: true,
    },
    accountNumber: {
        type: String,
        trim: true,
    },
    bankName: {
        type: String,
        trim: true,
    },
    ifscCode: {
        type: String,
        trim: true,
        uppercase: true,
    },
    upiId: {
        type: String,
        trim: true,
        lowercase: true
    }
}, {
    _id: false
});
const withdrawalRequestSchema = new Schema({
    walletId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        requried: true,
        index: true,
    },
    ownerRole: {
        type: String,
        enum: [Role.USER, Role.COORDINATOR],
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01,
    },
    status: {
        type: String,
        enum: ["PENDING", "APPROVED", "PROCESSING", "PAID", "REJECTED", "CANCELLED"],
        required: true,
        default: "PENDING",
        index: true,
    },
    destinationSnapshot: {
        type: withdrawalDestinationSnapshotSchema,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ["NEFT", "IMPS", "RTGS", "UPI", "BANK_TRANSFER", "OTHER"],
    },
    paymentReference: {
        type: String,
        trim: true,
    },
    requestedAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    approvedAt: {
        type: Date,
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    processingAt: {
        type: Date
    },
    processingBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    paidAt: {
        type: Date
    },
    paidBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    rejectedAt: {
        type: Date
    },
    rejectedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    rejectionReason: {
        type: String,
        trim: true,
        maxLength: 500
    },
    cancelledAt: {
        type: Date,
    },
    cancelledBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    cancellationReason: {
        type: String,
        trim: true,
        maxLength: 500
    },
    adminNotes: {
        type: String,
        trim: true,
        maxLength: 1000
    },
}, {
    timestamps: true,
    versionKey: false,
});
withdrawalRequestSchema.index({
    ownerId: 1,
    owneroRole: 1,
    createdAt: -1
});
withdrawalRequestSchema.index({
    status: 1,
    requestedAt: -1
});
withdrawalRequestSchema.index({
    walletId: 1,
    createdAt: -1
});
export const WithdrawalRequest = model("WithdrawalRequest", withdrawalRequestSchema);
//# sourceMappingURL=withdrawal-request.model.js.map