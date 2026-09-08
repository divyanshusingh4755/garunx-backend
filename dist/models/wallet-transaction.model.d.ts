import { type Document, type Model, type Types } from "mongoose";
import { Role } from "../types/rbac.js";
export type WalletOwnerRole = Role.USER | Role.COORDINATOR;
export type WalletTransactionType = "BOOKING_REFUND" | "COORDINATOR_EARNING" | "WITHDRAWAL" | "WITHDRAWAL_REVERSAL" | "ADMIN_CREDIT" | "ADMIN_DEBIT";
export type WalletTransactionDirection = "CREDIT" | "DEBIT";
export interface IWalletTransaction extends Document {
    _id: Types.ObjectId;
    walletId: Types.ObjectId;
    ownerId: Types.ObjectId;
    ownerRole: WalletOwnerRole;
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
interface IWalletTransactionModel extends Model<IWalletTransaction> {
}
export declare const WalletTransaction: IWalletTransactionModel;
export {};
//# sourceMappingURL=wallet-transaction.model.d.ts.map