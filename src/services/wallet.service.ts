import { Types, type ClientSession } from "mongoose";
import { Role } from "../types/rbac.js";
import { Wallet, type IWallet } from "../models/wallet.model.js";
import { User } from "../models/user.model.js";
import { WalletTransaction, type WalletTransactionDirection, type WalletTransactionType } from "../models/wallet-transaction.model.js";
import { OutboxService } from "./outbox.service.js";
import { DOMAIN_EVENTS } from "../events/domain-events.js";

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
    session: ClientSession
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
    session: ClientSession
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

export class WalletService {
    private static round(value: number): number {
        return Math.round((value + Number.EPSILON) * 100) / 100
    }

    private static normalizedObjectId(value: string | Types.ObjectId, fieldName: string): Types.ObjectId {
        if (value instanceof Types.ObjectId) {
            return value
        }

        if (!Types.ObjectId.isValid(value)) {
            throw new Error(`Invalid ${fieldName}`)
        }

        return new Types.ObjectId(value);
    }

    private static validateAmount(amount: number,): number {
        if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
            throw new Error("Wallet amount must be greater than zero");
        }

        const rounded = this.round(amount);
        if (rounded <= 0) { throw new Error("Wallet amount must be greater than zero"); }
        return rounded;
    }

    private static validateOwnerRole(ownerRole: WalletOwnerRole): void {
        if (ownerRole !== Role.USER && ownerRole !== Role.COORDINATOR) {
            throw new Error("Wallet is only available for USER or COORDINATOR")
        }
    }

    // Returns wallet if present. Otherwise creates it. Must always be called inside the caller's transaction
    static async getOrCreateWallet(params: { ownerId: string | Types.ObjectId; ownerRole: WalletOwnerRole, session: ClientSession }): Promise<IWallet> {
        const ownerId = this.normalizedObjectId(params.ownerId, "owner ID")
        this.validateOwnerRole(params.ownerRole);

        const user = await User.findOne({ _id: ownerId, role: params.ownerRole, isActive: true }).select("_id role").session(params.session).lean();
        if (!user) {
            throw new Error(`${params.ownerRole} not found or inactive`)
        }

        let wallet = await Wallet.findOne({ ownerId, ownerRole: params.ownerRole }).session(params.session)
        if (wallet) {
            if (!wallet.isActive) {
                throw new Error("Wallet is inactive")
            }
            return wallet;
        }

        try {
            const [createdWallet] = await Wallet.create([
                {
                    ownerId,
                    ownerRole: params.ownerRole,
                    availableBalance: 0,
                    reservedBalance: 0,
                    lifetimeCredits: 0,
                    lifetimeDebits: 0,
                    currency: "INR",
                    isActive: true
                }
            ],
                {
                    session: params.session
                }
            )

            if (!createdWallet) {
                throw new Error("Failed to create wallet")
            }

            return createdWallet;
        } catch (error: any) {
            // Concurrent requests may both try to create the wallet. Becuase ownerId + ownerRole has a unique index, one succeeds and one may receive duplicate key. Re-read the wallet instead of failing.
            if (error?.code === 11000) {
                wallet = await Wallet.findOne({ ownerId, ownerRole: params.ownerRole }).session(params.session);
                if (!wallet) {
                    throw error
                }

                return wallet;
            }

            throw error;
        }
    }

    // CREDIT: User booking refund, Coordinator booking earning. Admin credit adjustment
    static async credit(params: WalletCreditParams) {
        const amount = this.validateAmount(params.amount);
        const ownerId = this.normalizedObjectId(params.ownerId, "owner ID");
        this.validateOwnerRole(params.ownerRole);

        if (!params.idempotencyKey?.trim()) {
            throw new Error("Wallet idempotency key is required")
        }

        // Check idempotency before changing balance.
        const existingTransaction = await WalletTransaction.findOne({ idempotencyKey: params.idempotencyKey.trim() }).session(params.session);
        if (existingTransaction) {
            return existingTransaction
        }

        const wallet = await this.getOrCreateWallet({ ownerId, ownerRole: params.ownerRole, session: params.session });
        const balanceBefore = this.round(wallet.availableBalance);
        const balanceAfter = this.round(balanceBefore + amount);
        wallet.availableBalance = balanceAfter;
        wallet.lifetimeCredits = this.round(wallet.lifetimeCredits + amount)
        await wallet.save({ session: params.session })

        const bookingId = params.bookingId ? this.normalizedObjectId(params.bookingId, "booking ID") : undefined;
        const createdBy = params.createdBy ? this.normalizedObjectId(params.createdBy, "created by") : undefined;
        const [transaction] = await WalletTransaction.create([
            {
                walletId: wallet._id,
                ownerId,
                ownerRole: params.ownerRole,
                type: params.type,
                direction: "CREDIT",
                amount,
                balanceBefore,
                balanceAfter,
                ...(bookingId ? { bookingId } : {}),
                idempotencyKey: params.idempotencyKey.trim(),
                ...(params.reference ? { reference: params.reference.trim() } : {}),
                ...(params.description ? { description: params.description.trim() } : {}),
                ...(createdBy ? { createdBy } : {})
            },
        ], { session: params.session }
        )

        if (!transaction) {
            throw new Error("Failed to create wallet transaction")
        }

        await OutboxService.createEvent({
            eventId: `WALLET.CREDITED:${transaction._id.toString()}`,
            eventType: DOMAIN_EVENTS.WALLET_CREDITED,
            aggregateType: "WALLET",
            aggregateId: wallet._id.toString(),
            payload: {
                walletId: wallet._id.toString(),
                transactionId: transaction._id.toString(),
                ownerId: ownerId.toString(),
                ownerRole: params.ownerRole,
                amount,
                transactionType: params.type,
                balanceAfter
            },
            session: params.session
        });

        return transaction;
    }

    // Reserve money for withdrawal. No ledger transaction is created because money has not left the wallet yet. availableBalance decreases reservedBalance increases
    static async reservedForWithdrawal(params: WalletReservedParams): Promise<IWallet> {
        const amount = this.validateAmount(params.amount);
        const ownerId = this.normalizedObjectId(params.ownerId, "owner ID")
        this.validateOwnerRole(params.ownerRole);

        const wallet = await this.getOrCreateWallet({ ownerId, ownerRole: params.ownerRole, session: params.session });

        // Atomic balance check.
        // Important: Do not simply read balance and then save. Two simultaneous withdrawal requests could otherwise reserve the same money.
        const updatedWallet = await Wallet.findOneAndUpdate(
            {
                _id: wallet._id,
                ownerId,
                ownerRole: params.ownerRole,
                isActive: true,
                availableBalance: { $gte: amount },
            }, {
            $inc: { availableBalance: -amount, reservedBalance: amount }
        },
            { new: true, runValidators: true, session: params.session }
        );

        if (!updatedWallet) {
            throw new Error("Insufficient available wallet balance")
        }

        return updatedWallet;
    }

    // Release reserved withdrawal money. Used when withdrawal becomes: REJECTED, CANCELLED. reservedBalance decreases, availableBalance increases
    static async releaseWithdrawalReservation(params: WalletReleaseParams): Promise<IWallet> {
        const amount = this.validateAmount(params.amount);
        const ownerId = this.normalizedObjectId(params.ownerId, "owner ID");
        this.validateOwnerRole(params.ownerRole);

        const updatedWallet = await Wallet.findOneAndUpdate(
            {
                ownerId,
                ownerRole: params.ownerRole,
                isActive: true,
                reservedBalance: { $gte: amount }
            }, {
            $inc: {
                availableBalance: amount,
                reservedBalance: -amount
            }
        }, {
            new: true,
            runValidators: true,
            session: params.session
        }
        )

        if (!updatedWallet) {
            throw new Error("Wallet reservation not found or insufficient reserver balance")
        }

        return updatedWallet;
    }

    // Finalize withdrawal after admin has actually paid. reservedBalance decreases. availableBalance DOES NOT change becuase the money was already removed from available balance when withdrawal was requested. LifetimeDebits increases.
    static async completeWithdrawal(params: CompleteWithdrawalParams) {
        const amount = this.validateAmount(params.amount);
        const ownerId = this.normalizedObjectId(params.ownerId, "owner ID");
        const withdrawalRequestId = this.normalizedObjectId(params.withdrawalRequestId, "withdrawal request ID")
        this.validateOwnerRole(params.ownerRole);

        if (!params.idempotencyKey?.trim()) {
            throw new Error("Wallet idempotency key is required")
        }

        const existingTransaction = await WalletTransaction.findOne({ idempotencyKey: params.idempotencyKey.trim() }).session(params.session);
        if (existingTransaction) {
            return existingTransaction
        }

        const wallet = await Wallet.findOneAndUpdate({
            ownerId,
            ownerRole: params.ownerRole,
            isActive: true,
            reservedBalance: { $gte: amount },
        },
            {
                $inc: {
                    reservedBalance: -amount,
                    lifetimeDebits: amount
                }
            },
            { new: false, runValidators: true, session: params.session }
        )

        if (!wallet) {
            throw new Error("Insufficient reserved wallet balance")
        }

        // At this point availableBalance was already reduced when withdrawal was requested. Therefore the effective wallet balance before and after the actual bank payout remains availableBalance.
        const balanceBefore = this.round(wallet.availableBalance)
        const balanceAfter = balanceBefore;
        const createdBy = params.createdBy ? this.normalizedObjectId(params.createdBy, "created by") : undefined;
        const [transaction] = await WalletTransaction.create(
            [
                {
                    walletId: wallet._id,
                    ownerId,
                    ownerRole: params.ownerRole,
                    type: "WITHDRAWAL",
                    direction: "DEBIT",
                    amount,
                    balanceBefore,
                    balanceAfter,
                    withdrawalRequestId,
                    idempotencyKey: params.idempotencyKey.trim(),
                    ...(params.reference ? { reference: params.reference.trim() } : {}),
                    ...(params.description ? { description: params.description.trim() } : {}),
                    ...(createdBy ? { createdBy } : {})
                }
            ],
            { session: params.session }
        )

        if (!transaction) {
            throw new Error("Failed to create withdrawal wallet transaction")
        }

        await OutboxService.createEvent({
            eventId: `WALLET.DEBITED:${transaction._id.toString()}`,
            eventType: DOMAIN_EVENTS.WALLET_DEBITED,
            aggregateType: "WALLET",
            aggregateId: wallet._id.toString(),
            payload: {
                walletId: wallet._id.toString(),
                transactionId: transaction._id.toString(),
                ownerId: ownerId.toString(),
                ownerRole: params.ownerRole,
                amount,
                transactionType: "WITHDRAWAL",
                withdrawalRequestId: withdrawalRequestId.toString()
            },
            session: params.session
        })
        return transaction;
    }

    // ADMIN DEBIT. Used only for controlled admin adjustments. This removes money directly from availableBalance.
    static async adminDebit(params: AdminDebitParams) {
        const amount = this.validateAmount(params.amount);
        const ownerId = this.normalizedObjectId(params.ownerId, "owner ID")
        const createdBy = this.normalizedObjectId(params.createdBy, "created by")
        this.validateOwnerRole(params.ownerRole);

        if (!params.idempotencyKey?.trim()) {
            throw new Error("Wallet idempotency key is required")
        }

        if (!params.description?.trim()) {
            throw new Error("Admin debit reason is required")
        }

        const existringTransaction = await WalletTransaction.findOne({ idempotencyKey: params.idempotencyKey.trim() }).session(params.session);
        if (existringTransaction) { return existringTransaction }

        const wallet = await Wallet.findOneAndUpdate({
            ownerId,
            ownerRole: params.ownerRole,
            isActive: true,
            availableBalance: { $gte: amount },
        }, {
            $inc: {
                availableBalance: -amount,
                lifetimeDebits: amount
            }
        }, {
            new: false,
            runValidators: true,
            session: params.session
        });

        if (!wallet) {
            throw new Error("Insufficient available wallet balance")
        }

        const balanceBefore = this.round(wallet.availableBalance);
        const balanceAfter = this.round(balanceBefore - amount)
        const [transaction] = await WalletTransaction.create([
            {
                walletId: wallet._id,
                ownerId,
                ownerRole: params.ownerRole,
                type: "ADMIN_DEBIT",
                direction: "DEBIT",
                amount,
                balanceBefore,
                balanceAfter,
                idempotencyKey: params.idempotencyKey.trim(),
                ...(params.reference ? { reference: params.reference.trim() } : {}),
                description: params.description.trim(),
                createdBy
            }
        ], { session: params.session })

        if (!transaction) {
            throw new Error("Failed to create admin debit transaction")
        }

        return transaction
    }

    // Convenience wrapper for booking refund
    static async creditBookingRefund(params: {
        userId: string | Types.ObjectId;
        bookingId: string | Types.ObjectId;
        refundId: string;
        amount: number;
        reason?: string;
        createdBy?: string | Types.ObjectId;
        session: ClientSession
    }) {
        const bookingId = this.normalizedObjectId(params.bookingId, "booking ID")
        const refundId = params.refundId.trim();
        if (!refundId) {
            throw new Error("Refund ID is required")
        }

        return this.credit({
            ownerId: params.userId,
            ownerRole: Role.USER,
            amount: params.amount,
            type: "BOOKING_REFUND",
            bookingId,
            idempotencyKey: `BOOKING_REFUND:${bookingId.toString()}:${refundId}`,
            reference: refundId,
            description: params.reason?.trim() ? `Booking refund ${params.reason.trim()}` : "Booking refund",
            ...(params.createdBy ? { createdBy: params.createdBy } : {}),
            session: params.session
        })
    }

    // Convenience wrapper for coordinator earning. One coordinator earning per completed booking.
    static async creditCoordinatorEarning(params: { coordinatorId: string | Types.ObjectId; bookingId: string | Types.ObjectId; amount: number; session: ClientSession }) {
        const bookingId = this.normalizedObjectId(params.bookingId, "booking ID")
        return this.credit({
            ownerId: params.coordinatorId,
            ownerRole: Role.COORDINATOR,
            amount: params.amount,
            type: "COORDINATOR_EARNING",
            bookingId,
            idempotencyKey: `COORDINATOR_EARNING:${bookingId.toString()}`,
            reference: bookingId.toString(),
            description: "Coordinator earning for completed booking",
            session: params.session
        })
    }

    // Get My Wallet
    // USER / COORDINATOR = Read only method. If the wallet does not exist yet, return a zero-balance representation instead of creating a wallet.
    static async getMyWallet(ownerId: string | Types.ObjectId, ownerRole: WalletOwnerRole) {
        this.validateOwnerRole(ownerRole);
        const ownerObjectId = this.normalizedObjectId(ownerId, "owner ID");
        const wallet = await Wallet.findOne({ ownerId: ownerObjectId, ownerRole })
            .select(
                [
                    "_id",
                    "ownerId",
                    "ownerRole",
                    "availableBalance",
                    "reservedBalance",
                    "lifetimeCredits",
                    "lifetimeDebits",
                    "currency",
                    "isActive",
                    "createdAt",
                    "updatedAt",
                ].join(" "),
            ).lean();

        // A wallet doesnot have to exist until user's first financial operation. Do not create a wallet just because the user opened the wallet screen.
        if (!wallet) {
            return {
                ownerId: ownerObjectId,
                ownerRole,
                availableBalance: 0,
                reservedBalance: 0,
                lifetimeCredits: 0,
                lifetimeDebits: 0,
                currency: "INR" as const,
                isActive: true,
            };
        }
        return wallet;
    }

    // Get My- wallet transactions
    // USER / COORDINATOR. Supports: pagination, transaction type filter, direction filter, ascending/descending date order
    static async getMyTransactions(
        ownerId: string | Types.ObjectId,
        ownerRole: WalletOwnerRole,
        options: { page?: number; limit?: number; type?: string; direction?: string; sortOrder?: "asc" | "desc" } = {}
    ) {
        this.validateOwnerRole(ownerRole);
        const ownerObjectId = this.normalizedObjectId(ownerId, "owner ID");
        const page = Number.isInteger(options.page) && Number(options.page) > 0 ? Number(options.page) : 1;
        const limit = Number.isInteger(options.limit) && Number(options.limit) > 0 ? Math.min(Number(options.limit), 100) : 20;
        const allowedTypes: WalletTransactionType[] = ["BOOKING_REFUND", "COORDINATOR_EARNING", "WITHDRAWAL", "WITHDRAWAL_REVERSAL", "ADMIN_CREDIT", "ADMIN_DEBIT"];
        const allowedDirections: WalletTransactionDirection[] = ["CREDIT", "DEBIT"];
        const filter: Record<string, unknown> = { ownerId: ownerObjectId, ownerRole }

        // Transaction type filter
        if (options.type) {
            if (!allowedTypes.includes(options.type as WalletTransactionType)) {
                throw new Error("Invalid wallet transaction type")
            }

            filter.type = options.type;
        }

        // CREDIT / DEBIT filter
        if (options.direction) {
            if (!allowedDirections.includes(options.direction as WalletTransactionDirection)) {
                throw new Error("Inavlid wallet transaction direction")
            }

            filter.direction = options.direction;
        }

        const sortOrder = options.sortOrder === "asc" ? 1 : -1;
        const [transactions, total] = await Promise.all([
            WalletTransaction.find(filter).select("-idempotencyKey").sort({ createdAt: sortOrder }).skip((page - 1) * limit).limit(limit).lean(),
            WalletTransaction.countDocuments(filter)
        ]);

        return {
            data: transactions,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        }
    }
}