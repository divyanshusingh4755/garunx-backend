import { Types } from "mongoose";
import { type IWithdrawalRequest, type WithdrawalPaymentMethod } from "../models/withdrawal-request.model.js";
import { Role } from "../types/rbac.js";
type WalletOwnerRole = Role.USER | Role.COORDINATOR;
interface CreateWithdrawalParams {
    ownerId: string;
    ownerRole: WalletOwnerRole;
    amount: number;
    destinationType?: "BANK";
}
interface AdminWithdrawalActionParams {
    withdrawalRequestId: string;
    adminId: string;
}
interface RejectWithdrawalParams extends AdminWithdrawalActionParams {
    reason: string;
    adminNotes?: string;
}
interface MarkProcessingParams extends AdminWithdrawalActionParams {
    adminNotes?: string;
}
interface MarkPaidParams extends AdminWithdrawalActionParams {
    paymentMethod: WithdrawalPaymentMethod;
    paymentReference: string;
    adminNotes?: string;
}
interface CancelWithdrawalParams {
    withdrawalRequestId: string;
    ownerId: string;
    ownerRole: WalletOwnerRole;
    reason?: string;
}
interface WithdrawalListParams {
    ownerId: string;
    ownerRole: WalletOwnerRole;
    status?: string;
    page?: number;
    limit?: number;
}
interface AdminWithdrawalListParams {
    status?: string;
    ownerRole?: WalletOwnerRole;
    ownerId?: string;
    page?: number;
    limit?: number;
    sortOrder?: "asc" | "desc";
}
export declare class WithdrawalService {
    private static round;
    private static validateAmount;
    private static objectId;
    private static validateOwnerRole;
    private static validateStatus;
    static createWithdrawal(params: CreateWithdrawalParams): Promise<IWithdrawalRequest>;
    static cancelWithdrawal(params: CancelWithdrawalParams): Promise<IWithdrawalRequest>;
    static approveWithdrawal(params: AdminWithdrawalActionParams): Promise<IWithdrawalRequest>;
    static markProcessing(params: MarkProcessingParams): Promise<IWithdrawalRequest>;
    static rejectWithdrawal(params: RejectWithdrawalParams): Promise<IWithdrawalRequest>;
    static markPaid(params: MarkPaidParams): Promise<IWithdrawalRequest>;
    static getMyWithdrawals(params: WithdrawalListParams): Promise<{
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    static getMyWithdrawalById(params: {
        withdrawalRequestId: string;
        ownerId: string;
        ownerRole: WalletOwnerRole;
    }): Promise<any>;
    static getAllWithdrawals(params: AdminWithdrawalListParams): Promise<{
        data: (IWithdrawalRequest & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    static getWithdrawalById(withdrawalRequestId: string): Promise<IWithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    private static assertAdmin;
    private static sanitizeWithdrawalForOwner;
}
export {};
//# sourceMappingURL=withdrawal.service.d.ts.map