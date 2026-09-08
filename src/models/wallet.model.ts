import { Document, model, Schema, type Model, type Types } from "mongoose";
import { Role } from "../types/rbac.js";

export type WalletOwnerRole = Role.USER | Role.COORDINATOR;

export interface IWallet extends Document {
    _id: Types.ObjectId;
    ownerId: Types.ObjectId;
    ownerRole: WalletOwnerRole;
    availableBalance: number;
    reservedBalance: number;
    lifetimeCredits: number;
    lifetimeDebits: number;
    currency: "INR";
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface IWalletModel extends Model<IWallet> { }

const walletSchema = new Schema<IWallet, IWalletModel>({
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
        index: true,
    },
    availableBalance: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    reservedBalance: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    lifetimeCredits: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    lifetimeDebits: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    currency: {
        type: String,
        enum: ["INR"],
        required: true,
        default: "INR"
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
        index: true
    }
},
    {
        timestamps: true,
        versionKey: false
    },
);

// One Waller per USER / COORDINATOR.
walletSchema.index({ ownerId: 1, ownerRole: 1 }, { unique: true });

// Useful for admin wallet listing,
walletSchema.index({ ownerRole: 1, isActive: 1, createdAt: -1 });

export const Wallet = model<IWallet, IWalletModel>("Wallet", walletSchema);