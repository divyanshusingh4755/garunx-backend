import { model, Schema, Document, type Model, type Types } from "mongoose";
import { Role } from "../types/rbac.js";

export type WalletOwnerRole = Role.USER | Role.COORDINATOR;
export type WithdrawalStatus = "PENDING" | "APPROVED" | "PROCESSING" | "PAID" | "REJECTED" | "CANCELLED";
export type WithdrawalDestinationType = "BANK" | "UPI";
export type WithdrawalPaymentMethod = "NEFT" | "IMPS" | "RTGS" | "UPI" | "BANK_TRANSFER" | "OTHER"

export interface IWithdrawalDestinationSnapshot {
    type: WithdrawalDestinationType;
    accountHolderName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    upiId?: string;
}

export interface IWithdrawalRequest extends Document {
    _id: Types.ObjectId;
    walletId: Types.ObjectId;
    ownerId: Types.ObjectId;
    ownerRole: WalletOwnerRole;
    amount: number;
    status: WithdrawalStatus;
    destinationSnapshot: IWithdrawalDestinationSnapshot;
    paymentMethod?: WithdrawalPaymentMethod;
    paymentReference?: string;
    requestedAt: Date;
    approvedAt?: Date;
    approvedBy?: Types.ObjectId;
    processingAt?: Date;
    processingBy?: Types.ObjectId;
    paidAt?: Date;
    paidBy?: Types.ObjectId;
    rejectedAt?: Date;
    rejectedBy?: Types.ObjectId;
    rejectionReason?: string;
    cancelledAt?: Date;
    cancelledBy?: Types.ObjectId;
    cancellationReason?: string;
    adminNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface IWithdrawalRequestModel extends Model<IWithdrawalRequest> { }

const withdrawalDestinationSnapshotSchema = new Schema<IWithdrawalDestinationSnapshot>(
    {
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
}
)

const withdrawalRequestSchema = new Schema<IWithdrawalRequest, IWithdrawalRequestModel>(
    {
        walletId: {
            type: Schema.Types.ObjectId,
            ref: "Wallet",
            required: true,
            index: true
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
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
    },
    {
        timestamps: true,
        versionKey: false,
    }
)

withdrawalRequestSchema.index({
    ownerId: 1,
    ownerRole: 1,
    createdAt: -1,
});

withdrawalRequestSchema.index({
    status: 1,
    requestedAt: -1
})

withdrawalRequestSchema.index({
    walletId: 1,
    createdAt: -1
})

export const WithdrawalRequest = model<IWithdrawalRequest, IWithdrawalRequestModel>("WithdrawalRequest", withdrawalRequestSchema)