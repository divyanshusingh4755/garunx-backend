import { type Document, type Model, type Types } from "mongoose";
import { Role } from "../types/rbac.js";
export type WallerOwnerRole = Role.USER | Role.COORDINATOR;
export type WithdrawalStatus = "PENDING" | "APPROVED" | "PROCESSING" | "PAID" | "REJECTED" | "CANCELLED";
export type WithdrawalDestinationType = "BANK" | "UPI";
export type WithdrawalPaymentMethod = "NEFT" | "IMPS" | "RTGS" | "UPI" | "BANK_TRANSFER" | "OTHER";
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
    ownerRole: WallerOwnerRole;
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
interface IWithdrawalRequestModel extends Model<IWithdrawalRequest> {
}
export declare const WithdrawalRequest: IWithdrawalRequestModel;
export {};
//# sourceMappingURL=withdrawal-request.model.d.ts.map