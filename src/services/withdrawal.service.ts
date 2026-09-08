import mongoose, { Types, type ClientSession } from "mongoose";
import { WithdrawalRequest, type IWithdrawalRequest, type WithdrawalPaymentMethod } from "../models/withdrawal-request.model.js";
import { Role } from "../types/rbac.js";
import { User } from "../models/user.model.js";
import { WalletService } from "./wallet.service.js";
import { OutboxService } from "./outbox.service.js";
import { DOMAIN_EVENTS } from "../events/domain-events.js";

type WalletOwnerRole = Role.USER | Role.COORDINATOR;
interface CreateWithdrawalParams {
    ownerId: string;
    ownerRole: WalletOwnerRole;
    amount: number;
    // UPI can be added once we introduce saved UPI accounts.
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

export class WithdrawalService {
    private static round(value: number): number {
        return Math.round((value + Number.EPSILON) * 100) / 100
    }

    private static validateAmount(amount: number): number {
        if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
            throw new Error("Withdrawal amount must be greater than zero")
        }

        return this.round(amount);
    }

    private static objectId(value: string, fieldName: string): Types.ObjectId {
        if (!Types.ObjectId.isValid(value)) {
            throw new Error(`Invalid ${fieldName}`)
        }

        return new Types.ObjectId(value);
    }

    private static validateOwnerRole(role: WalletOwnerRole): void {
        if (role !== Role.USER && role !== Role.COORDINATOR) {
            throw new Error("Withdrawal is only available for USER or COORDINATOR")
        }
    }

    private static validateStatus(status: string): void {
        const allowedStatuses = ["PENDING", "APPROVED", "PROCESSING", "PAID", "REJECTED", "CANCELLED"]
        if (!allowedStatuses.includes(status)) {
            throw new Error("Invalid withdrawal status")
        }
    }

    // Create Withdrawal
    // 1. Verify Owner 2. Verify bank account 3. Get wallet 4. Reserve wallet balance 5. Create withdrawal request 6. Create outbox event
    static async createWithdrawal(params: CreateWithdrawalParams) {
        const { ownerId, ownerRole } = params;
        this.validateOwnerRole(ownerRole);
        const ownerObjectId = this.objectId(ownerId, "owner ID");
        const amount = this.validateAmount(params.amount);
        const session = await mongoose.startSession();
        let withdrawal!: IWithdrawalRequest;

        try {
            await session.withTransaction(async () => {
                // Verify USER / COORDINATOR
                const user = await User.findOne({ _id: ownerObjectId, role: ownerRole, isActive: true }).select(["_id", "role", "isBankDocumentVerified", "bankDocumentVerification"].join(" ")).session(session);
                if (!user) {
                    throw new Error(`${ownerRole} not found or inactive`)
                }

                // Business rule: Withdrawal required verified bank account.
                if (!user.isBankDocumentVerified) {
                    throw new Error("Bank account must be verified before requesting a withdrawal")
                }

                const bank = user.bankDocumentVerification;
                const accountHolderName = bank?.accountName?.trim();
                const accountNumber = bank?.accountNumber?.trim();
                const bankName = bank?.bankName?.trim();
                const ifscCode = bank?.ifscCode?.trim().toUpperCase();

                if (!accountHolderName || !accountNumber || !bankName || !ifscCode) {
                    throw new Error("Verified bank account details are incomplete")
                }

                // Ensure wallet exists before reserving
                const wallet = await WalletService.getOrCreateWallet({ ownerId: ownerObjectId, ownerRole, session });
                if (!wallet.isActive) {
                    throw new Error("Wallet is inactive")
                }

                // Reserve immediately. availableBalance -= amount, reservedBalance += amount
                await WalletService.reservedForWithdrawal({ ownerId: ownerObjectId, ownerRole, amount, session });

                // Snapshot destination
                // Important: Future changes to User bank account do not change this withdrawal request.
                const [createdWithdrawal] = await WithdrawalRequest.create([
                    {
                        walletId: wallet._id,
                        ownerId: ownerObjectId,
                        ownerRole,
                        amount,
                        status: "PENDING",
                        destinationSnapshot: {
                            type: "BANK",
                            accountHolderName,
                            accountNumber,
                            bankName,
                            ifscCode
                        },
                        requestedAt: new Date()
                    }
                ], { session })

                if (!createdWithdrawal) {
                    throw new Error("Failed to created withdrawal request")
                }

                withdrawal = createdWithdrawal

                await OutboxService.createEvent({
                    eventId: `WITHDRAWAL.REQUESTED:${withdrawal._id.toString()}`,
                    eventType: DOMAIN_EVENTS.WITHDRAWAL_REQUESTED,
                    aggregateType: "WITHDRAWAL",
                    aggregateId: withdrawal._id.toString(),
                    payload: {
                        withdrawalRequestId: withdrawal._id.toString(),
                        walletId: wallet._id.toString(),
                        ownerId: ownerObjectId.toString(),
                        ownerRole,
                        amount
                    },
                    session
                })
            })
        } finally {
            await session.endSession()
        }

        return withdrawal;
    }

    // User / Coordinator cancel
    // Only PENDING requests may-be cancelled by owner. Reserved amount is returned to available balance.
    static async cancelWithdrawal(params: CancelWithdrawalParams) {
        this.validateOwnerRole(params.ownerRole);
        const ownerId = this.objectId(params.ownerId, "owner ID")
        const withdrawalId = this.objectId(params.withdrawalRequestId, "withdrawal request ID");
        const reason = params.reason?.trim();
        const session = await mongoose.startSession();
        let result!: IWithdrawalRequest;

        try {
            await session.withTransaction(async () => {
                const withdrawal = await WithdrawalRequest.findOne({
                    _id: withdrawalId,
                    ownerId,
                    ownerRole: params.ownerRole,
                    status: "PENDING"
                }).session(session);

                if (!withdrawal) {
                    throw new Error("Pending withdrawal request not found")
                }

                await WalletService.releaseWithdrawalReservation({ ownerId, ownerRole: params.ownerRole, amount: withdrawal.amount, session });
                const now = new Date();
                withdrawal.status = "CANCELLED"
                withdrawal.cancelledAt = now;
                withdrawal.cancelledBy = ownerId;

                if (reason) {
                    withdrawal.cancellationReason = reason;
                }

                await withdrawal.save({ session });

                await OutboxService.createEvent({
                    eventId: `WITHDRAWAL.CANCELLED:${withdrawal._id.toString()}`,
                    eventType: DOMAIN_EVENTS.WITHDRAWAL_CANCELLED,
                    aggregateType: "WITHDRAWAL",
                    aggregateId: withdrawal._id.toString(),
                    payload: {
                        withdrawalRequestId: withdrawal._id.toString(),
                        ownerId: ownerId.toString(),
                        ownerRole: params.ownerRole,
                        amount: withdrawal.amount,
                    },
                    session
                });
                result = withdrawal;
            })
        } finally {
            await session.endSession();
        }

        return result;
    }

    // Admin approve: PENDING -> APPROVED. Wallet remains reserved.
    static async approveWithdrawal(params: AdminWithdrawalActionParams) {
        const withdrawalId = this.objectId(params.withdrawalRequestId, "withdrawal request ID");
        const adminId = this.objectId(params.adminId, "admin ID");
        const session = await mongoose.startSession();
        let result!: IWithdrawalRequest;

        try {
            await session.withTransaction(async () => {
                await this.assertAdmin(adminId, session)
                const withdrawal = await WithdrawalRequest.findOne({ _id: withdrawalId, status: "PENDING" }).session(session);
                if (!withdrawal) {
                    throw new Error("Pending withdrawal request not found");
                }

                const now = new Date();

                withdrawal.status = "APPROVED";
                withdrawal.approvedAt = now;
                withdrawal.approvedBy = adminId;
                await withdrawal.save({ session });

                await OutboxService.createEvent({
                    eventId: `WITHDRAWAL.APPROVED:${withdrawal._id.toString()}`,
                    eventType: DOMAIN_EVENTS.WITHDRAWAL_APPROVED,
                    aggregateType: "WITHDRAWAL",
                    aggregateId: withdrawal._id.toString(),
                    payload: {
                        withdrawalRequestId: withdrawal._id.toString(),
                        ownerId: withdrawal.ownerId.toString(),
                        ownerRole: withdrawal.ownerRole,
                        amount: withdrawal.amount,
                        approvedBy: adminId.toString()
                    },
                    session,
                })

                result = withdrawal
            })
        } finally {
            await session.endSession()
        }

        return result;
    }

    // Admin mark processing
    // APPROVED -> PROCESSING. This means admin has start thie physical NEFT/IMPS/RTGS/etc payment process.
    static async markProcessing(params: MarkProcessingParams) {
        const withdrawalId = this.objectId(params.withdrawalRequestId, "withdrawal request ID");
        const adminId = this.objectId(params.adminId, "admin ID");
        const session = await mongoose.startSession();
        let result!: IWithdrawalRequest;

        try {
            await session.withTransaction(async () => {
                await this.assertAdmin(adminId, session);
                const withdrawal = await WithdrawalRequest.findOne({ _id: withdrawalId, status: "APPROVED" }).session(session);
                if (!withdrawal) {
                    throw new Error("Approved withdrawal request not found");
                }

                withdrawal.status = "PROCESSING"
                withdrawal.processingAt = new Date();
                withdrawal.processingBy = adminId;

                if (params.adminNotes?.trim()) {
                    withdrawal.adminNotes = params.adminNotes.trim();
                }

                await withdrawal.save({ session })
                result = withdrawal;
            })
        } finally {
            await session.endSession();
        }

        return result
    }

    // Admin reject
    // PENDING / APPROVED -> REJECTED. Reserved balance is released back. We intentionally don't allow rejecting PROCESSING here becuase payment may already have be initialized
    static async rejectWithdrawal(params: RejectWithdrawalParams) {
        const withdrawalId = this.objectId(params.withdrawalRequestId, "withdrawal request ID");
        const adminId = this.objectId(params.adminId, "admin ID");

        const reason = params.reason?.trim();
        if (!reason) {
            throw new Error("Rejection reason is required")
        }

        const session = await mongoose.startSession();
        let result!: IWithdrawalRequest;

        try {
            await session.withTransaction(async () => {
                await this.assertAdmin(adminId, session);
                const withdrawal = await WithdrawalRequest.findOne({
                    _id: withdrawalId,
                    status: { $in: ["PENDING", "APPROVED"] }
                }).session(session);

                if (!withdrawal) {
                    throw new Error("withdrawal cannot be rejected in its current status")
                }

                await WalletService.releaseWithdrawalReservation({
                    ownerId: withdrawal.ownerId,
                    ownerRole: withdrawal.ownerRole,
                    amount: withdrawal.amount,
                    session
                })

                const now = new Date();
                withdrawal.status = "REJECTED";
                withdrawal.rejectedAt = now;
                withdrawal.rejectedBy = adminId;
                withdrawal.rejectionReason = reason;

                if (params.adminNotes?.trim()) {
                    withdrawal.adminNotes = params.adminNotes.trim()
                }

                await withdrawal.save({ session });

                await OutboxService.createEvent({
                    eventId: `WITHDRAWAL.REJECTED:${withdrawal._id.toString()}`,
                    eventType: DOMAIN_EVENTS.WITHDRAWAL_REJECTED,
                    aggregateType: "WITHDRAWAL",
                    aggregateId: withdrawal._id.toString(),
                    payload: {
                        withdrawalRequestId: withdrawal._id.toString(),
                        ownerId: withdrawal.ownerId.toString(),
                        ownerRole: withdrawal.ownerRole,
                        amount: withdrawal.amount,
                        reason,
                    },
                    session
                });
                result = withdrawal;
            })
        } finally {
            await session.endSession()
        }

        return result;
    }

    // Admin mark paid
    // PROCESSING -> PAID. Admin has acutally transferred the money. reservedBalance -= amount. lifetimeDebits += amount. WalletTransaction WITHDRWALA is created.
    static async markPaid(params: MarkPaidParams) {
        const withdrawalId = this.objectId(params.withdrawalRequestId, "withdrawal request ID");
        const adminId = this.objectId(params.adminId, "admin ID");

        const paymentReference = params.paymentReference?.trim();
        if (!paymentReference) {
            throw new Error("Payment reference is required")
        }

        const allowedMethods: WithdrawalPaymentMethod[] = ["NEFT", "IMPS", "RTGS", "UPI", "BANK_TRANSFER", "OTHER"]
        if (!allowedMethods.includes(params.paymentMethod)) {
            throw new Error("Invalid withdrawal payment method")
        }

        const session = await mongoose.startSession();
        let result!: IWithdrawalRequest;

        try {
            await session.withTransaction(async () => {
                await this.assertAdmin(adminId, session);

                const withdrawal = await WithdrawalRequest.findOne({ _id: withdrawalId, status: "PROCESSING" }).session(session);
                if (!withdrawal) {
                    // Idempotent retry: If it is already PAID, return existing request.
                    const alreadyPaid = await WithdrawalRequest.findOne({ _id: withdrawalId, status: "PAID" }).session(session)
                    if (alreadyPaid) {
                        result = alreadyPaid;
                        return;
                    }

                    throw new Error("Processing withdrawal request not found")
                }

                // Finialize wallet debit. Idempotency protects against duplicate WITHDRAWAL ledger entries
                await WalletService.completeWithdrawal({
                    ownerId: withdrawal.ownerId,
                    ownerRole: withdrawal.ownerRole,
                    amount: withdrawal.amount,
                    withdrawalRequestId: withdrawal._id,
                    idempotencyKey: `WITHDRAWAL:${withdrawal._id.toString()}`,
                    reference: paymentReference,
                    description: "Withdrawal paid by admin",
                    createdBy: adminId,
                    session
                })

                const now = new Date();
                withdrawal.status = "PAID";
                withdrawal.paymentMethod = params.paymentMethod;
                withdrawal.paymentReference = paymentReference;
                withdrawal.paidAt = now;
                withdrawal.paidBy = adminId;

                if (params.adminNotes?.trim()) {
                    withdrawal.adminNotes = params.adminNotes.trim();
                }

                await withdrawal.save({ session });

                await OutboxService.createEvent({
                    eventId: `WITHDRAWAL.PAID:${withdrawal._id.toString()}`,
                    eventType: DOMAIN_EVENTS.WITHDRAWAL_PAID,
                    aggregateType: "WITHDRAWAL",
                    aggregateId: withdrawal._id.toString(),
                    payload: {
                        withdrawalRequestId: withdrawal._id.toString(),
                        walletId: withdrawal.walletId.toString(),
                        ownerId: withdrawal.ownerId.toString(),
                        ownerRole: withdrawal.ownerRole,
                        amount: withdrawal.amount,
                        paymentMethod: params.paymentMethod,
                        paymentReference,
                        paidBy: adminId.toString(),
                        paidAt: now
                    },
                    session
                });
                result = withdrawal
            })
        } finally {
            await session.endSession()
        }

        return result;
    }

    // User / Coordinator List
    static async getMyWithdrawals(params: WithdrawalListParams) {
        this.validateOwnerRole(params.ownerRole);
        const ownerId = this.objectId(params.ownerId, "owner ID");
        if (params.status) { this.validateStatus(params.status); }
        const page = Math.max(1, Number(params.page) || 1)
        const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
        const filter: Record<string, unknown> = { ownerId, ownerRole: params.ownerRole }

        if (params.status) { filter.status = params.status };
        const [withdrawals, total] = await Promise.all([
            WithdrawalRequest.find(filter).select("-adminNotes").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            WithdrawalRequest.countDocuments(filter)
        ]);

        const safeWithdrawals = withdrawals.map((withdrawal) => this.sanitizeWithdrawalForOwner(withdrawal));
        return { data: safeWithdrawals, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
    }

    // User / Coordinator detail
    static async getMyWithdrawalById(params: { withdrawalRequestId: string; ownerId: string; ownerRole: WalletOwnerRole }) {
        this.validateOwnerRole(params.ownerRole)
        const withdrawalId = this.objectId(params.withdrawalRequestId, "withdrawal request ID");
        const ownerId = this.objectId(params.ownerId, "owner ID");

        const withdrawal = await WithdrawalRequest.findOne({ _id: withdrawalId, ownerId, ownerRole: params.ownerRole }).select("-adminNotes").lean();
        if (!withdrawal) {
            throw new Error("Withdrawal request not found")
        }

        // Mask account number
        return this.sanitizeWithdrawalForOwner(withdrawal);
    }

    // Admin list
    static async getAllWithdrawals(params: AdminWithdrawalListParams) {
        if (params.status) { this.validateStatus(params.status) }
        if (params.ownerRole) { this.validateOwnerRole(params.ownerRole) };
        const page = Math.max(1, Number(params.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
        const filter: Record<string, unknown> = {};
        if (params.status) { filter.status = params.status }
        if (params.ownerRole) { filter.ownerRole = params.ownerRole };
        if (params.ownerId) { filter.ownerId = this.objectId(params.ownerId, "owner ID") }

        const sortOrder = params.sortOrder === "asc" ? 1 : -1;
        const [withdrawals, total] = await Promise.all([
            WithdrawalRequest.find(filter)
                .populate("ownerId", "fullName email phoneNumber userReference role")
                .populate("approvedBy", "fullName email userReference")
                .populate("processingBy", "fullName email userReference")
                .populate("paidBy", "fullName email userReference")
                .populate("rejectedBy", "fullName email userReference")
                .sort({ requestedAt: sortOrder })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            WithdrawalRequest.countDocuments(filter)
        ])

        return { data: withdrawals, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
    }

    // Admin detail
    static async getWithdrawalById(withdrawalRequestId: string) {
        const withdrawalId = this.objectId(withdrawalRequestId, "withdrawal request ID")
        const withdrawal = await WithdrawalRequest.findById(withdrawalId)
            .populate("ownerId", "fullName email phoneNumber userReference role")
            .populate("approvedBy", "fullName email userReference")
            .populate("processingBy", "fullName email userReference")
            .populate("paidBy", "fullName email userReference")
            .populate("rejectedBy", "fullName email userReference")
            .lean()

        if (!withdrawal) {
            throw new Error("Withdrawal request not found")
        }

        return withdrawal
    }

    // Confirm acting adminstrator. Route RBAC should also enforce ADMIN. This is defense in depth because financial mutations deserve service-level validation too.
    private static async assertAdmin(adminId: Types.ObjectId, session: ClientSession): Promise<void> {
        const admin = await User.findOne({ _id: adminId, role: Role.ADMIN, isActive: true }).select("_id").session(session).lean()
        if (!admin) {
            throw new Error("Active admin account not found")
        }
    }

    // Never expose the complete bank account number unnecessarily to USER / COORDINATOR responses.
    private static sanitizeWithdrawalForOwner(withdrawal: any) {
        const destination = withdrawal.destinationSnapshot;
        if (!destination || destination.type !== "BANK") { return withdrawal }
        const accountNumber = String(destination.accountNumber ?? "")
        const maskedAccountNumber = accountNumber.length > 4 ? `${"*".repeat(Math.max(0, accountNumber.length - 4))}${accountNumber.slice(-4)}` : accountNumber;
        return {
            ...withdrawal,
            destinationSnapshot: { ...destination, accountNumber: maskedAccountNumber }
        }
    }
}