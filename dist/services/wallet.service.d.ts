import { Types, type ClientSession } from "mongoose";
import { Role } from "../types/rbac.js";
import { type IWallet } from "../models/wallet.model.js";
type WalletOwnerRole = Role.USER | Role.COORDINATOR;
interface WalletCreditParams {
    ownerId: string | Types.ObjectId;
    ownerRole: WalletOwnerRole;
    amount: number;
    type: "BOOKING_REFUND" | "COORDINATOR_EARNING" | "ADMIN_CREDIT";
    idempotencyKey: string;
    bookingId?: string | Types.ObjectId;
    reference?: string;
    description?: string;
    createdBy?: string | Types.ObjectId;
    session: ClientSession;
}
interface WalletReservedParams {
    ownerId: string | Types.ObjectId;
    ownerRole: WalletOwnerRole;
    amount: number;
    session: ClientSession;
}
interface WalletReleaseParams {
    ownerId: string | Types.ObjectId;
    ownerRole: WalletOwnerRole;
    amount: number;
    session: ClientSession;
}
interface CompleteWithdrawalParams {
    ownerId: string | Types.ObjectId;
    ownerRole: WalletOwnerRole;
    amount: number;
    withdrawalRequestId: string | Types.ObjectId;
    idempotencyKey: string;
    reference?: string;
    description: string;
    createdBy: string | Types.ObjectId;
    session: ClientSession;
}
interface AdminDebitParams {
    ownerId: string | Types.ObjectId;
    ownerRole: WalletOwnerRole;
    amount: number;
    idempotencyKey: string;
    reference?: string;
    description: string;
    createdBy: string | Types.ObjectId;
    session: ClientSession;
}
export declare class WalletService {
    private static round;
    private static normalizedObjectId;
    private static validateAmount;
    private static validateOwnerRole;
    static getOrCreateWallet(params: {
        ownerId: string | Types.ObjectId;
        ownerRole: WalletOwnerRole;
        session: ClientSession;
    }): Promise<IWallet>;
    static credit(params: WalletCreditParams): Promise<import("mongoose").Document<unknown, {}, import("../models/wallet-transaction.model.js").IWalletTransaction, {}, import("mongoose").DefaultSchemaOptions> & import("../models/wallet-transaction.model.js").IWalletTransaction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static reservedForWithdrawal(params: WalletReservedParams): Promise<IWallet>;
    static releaseWithdrawalReservation(params: WalletReleaseParams): Promise<IWallet>;
    static completeWithdrawal(params: CompleteWithdrawalParams): Promise<import("mongoose").Document<unknown, {}, import("../models/wallet-transaction.model.js").IWalletTransaction, {}, import("mongoose").DefaultSchemaOptions> & import("../models/wallet-transaction.model.js").IWalletTransaction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static adminDebit(params: AdminDebitParams): Promise<import("mongoose").Document<unknown, {}, import("../models/wallet-transaction.model.js").IWalletTransaction, {}, import("mongoose").DefaultSchemaOptions> & import("../models/wallet-transaction.model.js").IWalletTransaction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static creditBookingRefund(params: {
        userId: string | Types.ObjectId;
        bookingId: string | Types.ObjectId;
        refundId: string;
        amount: number;
        reason?: string;
        createdBy?: string | Types.ObjectId;
        session: ClientSession;
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/wallet-transaction.model.js").IWalletTransaction, {}, import("mongoose").DefaultSchemaOptions> & import("../models/wallet-transaction.model.js").IWalletTransaction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static creditCoordinatorEarning(params: {
        coordinatorId: string | Types.ObjectId;
        bookingId: string | Types.ObjectId;
        amount: number;
        session: ClientSession;
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/wallet-transaction.model.js").IWalletTransaction, {}, import("mongoose").DefaultSchemaOptions> & import("../models/wallet-transaction.model.js").IWalletTransaction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getMyWallet(ownerId: string | Types.ObjectId, ownerRole: WalletOwnerRole): Promise<(IWallet & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }) | {
        ownerId: Types.ObjectId;
        ownerRole: WalletOwnerRole;
        availableBalance: number;
        reservedBalance: number;
        lifetimeCredits: number;
        lifetimeDebits: number;
        currency: "INR";
        isActive: boolean;
    }>;
    static getMyTransactions(ownerId: string | Types.ObjectId, ownerRole: WalletOwnerRole, options?: {
        page?: number;
        limit?: number;
        type?: string;
        direction?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: (import("../models/wallet-transaction.model.js").IWalletTransaction & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
export {};
//# sourceMappingURL=wallet.service.d.ts.map