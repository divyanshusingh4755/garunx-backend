import { model, Schema } from "mongoose";
import { Role } from "../types/rbac.js";
const walletSchema = new Schema({
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
}, {
    timestamps: true,
    versionKey: false
});
// One Waller per USER / COORDINATOR.
walletSchema.index({ ownerId: 1, ownerRole: 1 }, { unique: true });
// Useful for admin wallet listing,
walletSchema.index({ ownerRole: 1, isActive: 1, createdAt: -1 });
export const Wallet = model("Waller", walletSchema);
//# sourceMappingURL=wallet.model.js.map