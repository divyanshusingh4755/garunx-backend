import { model, Schema, type Document, type Model, type Types } from "mongoose";
import { Role } from "../types/rbac.js";

export type WallerOwnerRole = Role.USER | Role.COORDINATOR;
export type WalletTransactionType = "BOOKING_REFUND" | "COORDINATOR_EARNING" | "WITHDRAWAL" | "WITHDRAWAL_REVERSAL" | "ADMIN_CREDIT" | "ADMIN_DEBIT";
export type WalletTransactionDirection = "CREDIT" | "DEBIT";

export interface IWalletTransaction extends Document {
    _id: Types.ObjectId;
    walletId: Types.ObjectId;
    ownerId: Types.ObjectId;
    ownerRole: WallerOwnerRole;
    type: WalletTransactionType;
    direction: WalletTransactionDirection;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    bookingId?: Types.ObjectId;
    withdrawalRequestId?: Types.ObjectId;
    idempotencyKey: string;
    reference?: string;
    description?: string;
    createdBy?: Types.ObjectId;
    createdAt: Date;
}

interface IWalletTransactionModel extends Model<IWalletTransaction> { }

const walletTransactionSchema = new Schema<IWalletTransaction, IWalletTransactionModel>(
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
            index: true
        },
        ownerRole: {
            type: String,
            enum: [Role.USER, Role.COORDINATOR],
            required: true,
            index: true
        },
        type: {
            type: String,
            enum: ["BOOKING_REFUND", "COORDINATOR_EARNING", "WITHDRAWAL", "WITHDRAWAL_REVERSAL", "ADMIN_CREDIT", "ADMIN_DEBIT"],
            required: true,
            index: true
        },
        direction: {
            type: String,
            enum: ["CREDIT", "DEBIT"],
            required: true,
            index: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0.01
        },
        balanceBefore: {
            type: Number,
            required: true,
            min: 0,
        },
        balanceAfter: {
            type: Number,
            requried: true,
            min: 0
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
            index: true,
        },
        withdrawalRequestId: {
            type: Schema.Types.ObjectId,
            ref: "WithdrawalRequest",
            index: true,
        },
        idempotencyKey: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            index: true
        },
        reference: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            maxLength: 500
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true
        },
    }, {
    timestamps: {
        createdAt: true,
        updatedAt: false,
    },
    versionKey: false
},
);

walletTransactionSchema.index({ walletId: 1, createdAt: -1 });
walletTransactionSchema.index({ ownerId: 1, ownerRole: 1, createdAt: -1 });
walletTransactionSchema.index({ type: 1, createdAt: 1 });
walletTransactionSchema.index({ bookingId: 1, type: 1 });
walletTransactionSchema.index({ withdrawalRequestId: 1, type: 1 });

export const WalletTransaction = model<IWalletTransaction, IWalletTransactionModel>("WalletTransaction", walletTransactionSchema);