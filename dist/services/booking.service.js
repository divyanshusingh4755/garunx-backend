import { CashfreeService } from "./cashfree.service.js";
import { Booking } from "../models/booking.model.js";
import mongoose, { Types } from "mongoose";
import { Cart } from "../models/cart.model.js";
import { Coupon } from "../models/coupon.model.js";
import { ReferralRewardService } from "./referralreward.service.js";
const STATUS_TRANSITIONS = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
};
export class BookingService {
    static async process(req) {
        const rawBody = req.body.toString("utf-8");
        const signature = req.header("x-webhook-signature") || "";
        const timestamp = req.header("x-webhook-timestamp") || "";
        const valid = CashfreeService.verifyWebhookSignature(rawBody, signature, timestamp);
        if (!valid) {
            console.error("Invalid webhook signature");
            return;
        }
        const payload = JSON.parse(rawBody);
        if (payload?.data?.test_object) {
            console.log("Cashfree webhook test received");
            return;
        }
        const orderId = payload?.data?.order?.order_id;
        const paymentId = payload?.data?.payment?.cf_payment_id;
        const paymentStatus = payload?.data?.payment?.payment_status;
        const paymentAmount = payload?.data?.payment?.payment_amount;
        const paymentGroup = payload?.data?.payment?.payment_group;
        if (!orderId) {
            throw new Error("Missing order id");
        }
        const booking = await Booking.findOne({ bookingReference: orderId });
        if (!booking) {
            throw new Error(`Booking not found for ${orderId}`);
        }
        if (booking.payment.status === "PAID") {
            return;
        }
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                if (paymentStatus === "SUCCESS") {
                    await Booking.updateOne({ _id: booking._id }, {
                        $set: {
                            "payment.status": "PAID",
                            "payment.amountPaid": paymentAmount,
                            "payment.providerPaymentId": paymentId,
                            "payment.gateway": "CASHFREE",
                            "payment.paymentMethod": paymentGroup,
                            "payment.paidAt": new Date(),
                            status: "CONFIRMED",
                            "lifecycle.confirmedAt": new Date(),
                        },
                    }, { session });
                    await Cart.updateOne({ _id: booking.cartId }, {
                        $set: { status: "CHECKED_OUT", checkedOutAt: new Date() },
                        $unset: { checkoutExpiresAt: 1 },
                    }, { session });
                    if (booking.pricing.couponId) {
                        await Coupon.updateOne({
                            _id: booking.pricing.couponId,
                        }, {
                            $inc: {
                                usedCount: 1,
                            },
                        }, { session });
                    }
                    if (!booking.userId) {
                        throw new Error("Booking user not found");
                    }
                    await ReferralRewardService.processReferralReward(booking.userId.toString(), booking._id.toString());
                    return;
                }
                if (paymentStatus === "FAILED") {
                    await Booking.updateOne({ _id: booking._id }, { $set: { "payment.status": "FAILED" } }, { session });
                    return;
                }
                await Booking.updateOne({ _id: booking._id }, { $set: { "payment.status": "PENDING" } }, { session });
            });
        }
        catch (error) {
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    static async retryPayment(bookingId, userId) {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            throw new Error("Booking not found");
        }
        if (booking.payment.status === "PAID") {
            throw new Error("Booking already paid");
        }
        if (booking.status === "CANCELLED") {
            throw new Error("Booking cancelled");
        }
        if (booking.status === "COMPLETED") {
            throw new Error("Booking already completed");
        }
        // STEP 1: check existing order
        if (booking.payment.providerOrderId) {
            const order = await CashfreeService.getOrder(booking.payment.providerOrderId);
            // CASE 1: reuse
            if (order.order_status === "ACTIVE") {
                return {
                    paymentSessionId: booking.payment.paymentSessionId,
                };
            }
            if (order.order_status === "PAID") {
                throw new Error("Payment Already done");
            }
        }
        const newOrderId = `${booking.bookingReference}-${Date.now()}`;
        const order = await CashfreeService.createOrder({
            orderId: newOrderId,
            amount: booking.pricing.grandTotal,
            customerName: booking.customerDetails?.name || "Customer",
            customerEmail: booking.customerDetails?.email || "",
            customerPhone: booking.customerDetails?.phone || "",
            userId: userId,
        });
        await Booking.updateOne({
            _id: booking._id,
        }, {
            $set: {
                "payment.providerOrderId": order.order_id,
                "payment.paymentSessionId": order.payment_session_id,
                "payment.lastAttemptAt": new Date(),
            },
            $inc: {
                "payment.attempts": 1,
            },
        });
        return {
            paymentSessionId: order.payment_session_id,
        };
    }
    static async getPaymentStatus(cartId, userId) {
        const cart = await Cart.findOne({ _id: cartId, userId });
        if (!cart?.activeBookingId) {
            return {
                hasPendingPayment: false,
                paymentStatus: null,
                bookingStatus: null,
            };
        }
        const booking = await Booking.findById(cart.activeBookingId);
        if (!booking) {
            return {
                hasPendingPayment: false,
                paymentStatus: null,
                bookingStatus: null,
            };
        }
        let cashfreeStatus = null;
        if (booking.payment.providerOrderId) {
            try {
                const order = await CashfreeService.getOrder(booking.payment.providerOrderId);
                cashfreeStatus = order.order_status;
            }
            catch (err) {
                console.error(err);
                cashfreeStatus = "UNKNOWN";
            }
        }
        // Sync DB if needed
        if (cashfreeStatus === "PAID" && booking.payment.status !== "PAID") {
            await Booking.updateOne({ _id: booking._id }, {
                $set: {
                    "payment.status": "PAID",
                    status: "CONFIRMED",
                },
            });
        }
        const hasPending = cashfreeStatus === "ACTIVE" || cashfreeStatus === "PENDING";
        const canRetry = cashfreeStatus === "EXPIRED" ||
            cashfreeStatus === "FAILED" ||
            cashfreeStatus === "UNKNOWN";
        return {
            hasPendingPayment: hasPending,
            bookingId: booking._id,
            bookingReference: booking.bookingReference,
            bookingStatus: booking.status,
            paymentStatus: booking.payment.status,
            cashfreeOrderStatus: cashfreeStatus,
            totalAmount: booking.pricing.grandTotal,
            canRetry,
            paymentSessionId: booking.payment.paymentSessionId,
        };
    }
    static async findBookings(params) {
        const { searchTerm, status, paymentStatus, userId, bookingReference, fromDate, toDate, limit = 20, page = 1, sortBy = "createdAt", sortOrder = "desc", } = params;
        const skip = (page - 1) * limit;
        const query = { isDeleted: false };
        if (status) {
            query.status = status;
        }
        if (paymentStatus) {
            query["payment.status"] = paymentStatus;
        }
        if (userId) {
            query.userId = userId;
        }
        if (bookingReference) {
            query.bookingReference = bookingReference;
        }
        if (fromDate || toDate) {
            query.createdAt = {};
            if (fromDate)
                query.createdAt.$gte = new Date(fromDate);
            if (toDate)
                query.createdAt.$lte = new Date(toDate);
        }
        if (searchTerm) {
            query.$or = [
                { bookingReference: { $regex: searchTerm, $options: "i" } },
                { "customerDetails.name": { $regex: searchTerm, $options: "i" } },
                { "customerDetails.email": { $regex: searchTerm, $options: "i" } },
                { "customerDetails.phone": { $regex: searchTerm, $options: "i" } },
            ];
        }
        let sortCriteria = {};
        sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
        if (sortBy !== "createdAt") {
            sortCriteria["createdAt"] = -1;
        }
        try {
            const [data, total] = await Promise.all([
                Booking.find(query)
                    .populate("userId", "name email phone")
                    .populate("cartId", "totalAmount status")
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Booking.countDocuments(query),
            ]);
            return {
                data,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            throw new Error(`Booking fetch failed: ${error.message}`);
        }
    }
    static async getBookingById(bookingId) {
        if (!bookingId) {
            throw new Error("Booking ID is required");
        }
        const booking = await Booking.findById(bookingId)
            .populate("userId", "name email phone")
            .populate("subAdminId", "name email")
            .lean();
        if (!booking) {
            throw new Error("Booking not found");
        }
        return {
            bookingId: booking._id,
            bookingReference: booking.bookingReference,
            status: booking.status,
            bookedBy: booking.bookedBy,
            customerDetails: booking.customerDetails,
            pricing: booking.pricing,
            payment: {
                status: booking.payment.status,
                method: booking.payment.paymentMethod,
                gateway: booking.payment.gateway,
                amountPaid: booking.payment.amountPaid,
                currency: booking.payment.currency,
                providerOrderId: booking.payment.providerOrderId,
                providerPaymentId: booking.payment.providerPaymentId,
                paymentSessionId: booking.payment.paymentSessionId,
                paidAt: booking.payment.paidAt,
                failureReason: booking.payment.failureReason,
            },
            entries: booking.entries,
            scheduledAt: booking.scheduledAt,
            notes: booking.notes,
            lifecycle: booking.lifecycle,
            cancellation: booking.cancellation,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt,
        };
    }
    static async getBookingStats() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const [bookingStats, paymentStats, revenueStats, todayBookings, thisMonthBookings,] = await Promise.all([
                Booking.aggregate([
                    {
                        $match: {
                            isDeleted: false,
                        },
                    },
                    {
                        $group: {
                            _id: "$status",
                            count: { $sum: 1 },
                        },
                    },
                ]),
                Booking.aggregate([
                    {
                        $match: {
                            isDeleted: false,
                        },
                    },
                    {
                        $group: {
                            _id: "$payment.status",
                            count: { $sum: 1 },
                        },
                    },
                ]),
                Booking.aggregate([
                    {
                        $match: {
                            isDeleted: false,
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            totalRevenue: {
                                $sum: {
                                    $cond: [
                                        { $eq: ["$payment.status", "PAID"] },
                                        "$pricing.grandTotal",
                                        0,
                                    ],
                                },
                            },
                            refundedAmount: {
                                $sum: "$payment.refundAmount",
                            },
                        },
                    },
                ]),
                Booking.countDocuments({
                    isDeleted: false,
                    createdAt: {
                        $gte: today,
                    },
                }),
                Booking.countDocuments({
                    isDeleted: false,
                    createdAt: {
                        $gte: monthStart,
                    },
                }),
            ]);
            const bookingMap = Object.fromEntries(bookingStats.map((item) => [item._id, item.count]));
            const paymentMap = Object.fromEntries(paymentStats.map((item) => [item._id, item.count]));
            return {
                totalBookings: Object.values(bookingMap).reduce((sum, count) => sum + count, 0),
                pendingBookings: bookingMap.PENDING || 0,
                confirmedBookings: bookingMap.CONFIRMED || 0,
                inProgressBookings: bookingMap.IN_PROGRESS || 0,
                completedBookings: bookingMap.COMPLETED || 0,
                cancelledBookings: bookingMap.CANCELLED || 0,
                pendingPayments: paymentMap.PENDING || 0,
                paidPayments: paymentMap.PAID || 0,
                failedPayments: paymentMap.FAILED || 0,
                refundedPayments: paymentMap.REFUNDED || 0,
                partialRefundPayments: paymentMap.PARTIAL_REFUND || 0,
                totalRevenue: revenueStats[0]?.totalRevenue || 0,
                refundedAmount: revenueStats[0]?.refundedAmount || 0,
                todayBookings,
                thisMonthBookings,
            };
        }
        catch (error) {
            throw new Error(`Booking stats fetch failed: ${error.message}`);
        }
    }
    static async updateBookingNotes(bookingId, notes) {
        if (!bookingId) {
            throw new Error("Booking ID is required");
        }
        if (typeof notes !== "string") {
            throw new Error("Notes must be a string");
        }
        const booking = await Booking.findOne({
            _id: bookingId,
            isDeleted: false,
        });
        if (!booking) {
            throw new Error("Booking not found");
        }
        if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
            throw new Error(`Cannot update notes for ${booking.status.toLowerCase()} booking`);
        }
        booking.notes = notes.trim();
        await booking.save();
        return {
            bookingId: booking._id,
            notes: booking.notes,
        };
    }
    static async updateBookingSchedule(bookingId, scheduledAt, userId, role) {
        if (!bookingId) {
            throw new Error("Booking ID is required");
        }
        if (!scheduledAt) {
            throw new Error("Scheduled date is required");
        }
        const booking = await Booking.findOne({
            _id: bookingId,
            isDeleted: false,
        });
        if (!booking) {
            throw new Error("Booking not found");
        }
        const isOwner = booking.userId?.toString() === userId;
        const isAdmin = role === "ADMIN";
        if (!isOwner && !isAdmin) {
            throw new Error("Not authorized");
        }
        if (booking.status === "IN_PROGRESS" ||
            booking.status === "COMPLETED" ||
            booking.status === "CANCELLED") {
            throw new Error(`Cannot reschedule ${booking.status.toLowerCase()} booking`);
        }
        const scheduleDate = new Date(scheduledAt);
        if (isNaN(scheduleDate.getTime())) {
            throw new Error("Invalid schedule date");
        }
        if (scheduleDate <= new Date()) {
            throw new Error("Scheduled date must be in the future");
        }
        booking.scheduledAt = scheduleDate;
        await booking.save();
        return {
            bookingId: booking._id,
            scheduledAt: booking.scheduledAt,
        };
    }
    static async updateBookingStatus(bookingId, status, userId, role, reason) {
        const booking = await Booking.findOne({
            _id: bookingId,
            isDeleted: false,
        });
        if (!booking) {
            throw new Error("Booking not found");
        }
        const allowedTransitions = STATUS_TRANSITIONS[booking.status];
        if (!allowedTransitions.includes(status)) {
            throw new Error(`Cannot change booking from ${booking.status} to ${status}`);
        }
        // Payment validations
        if (["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(status) &&
            booking.payment.status !== "PAID") {
            throw new Error("Booking payment must be PAID before progressing");
        }
        const now = new Date();
        switch (status) {
            case "CONFIRMED":
                booking.status = "CONFIRMED";
                booking.lifecycle = {
                    ...booking.lifecycle,
                    confirmedAt: now,
                    confirmedBy: new Types.ObjectId(userId),
                };
                break;
            case "IN_PROGRESS":
                booking.status = "IN_PROGRESS";
                break;
            case "COMPLETED":
                booking.status = "COMPLETED";
                booking.lifecycle = {
                    ...booking.lifecycle,
                    completedAt: now,
                    completedBy: new Types.ObjectId(userId),
                };
                break;
            case "CANCELLED":
                if (!reason?.trim()) {
                    throw new Error("Cancellation reason is required");
                }
                booking.status = "CANCELLED";
                booking.cancellation = {
                    reason,
                    cancelledAt: now,
                    cancelledBy: new Types.ObjectId(userId),
                    cancelledByRole: role,
                };
                booking.lifecycle = {
                    ...booking.lifecycle,
                    cancelledAt: now,
                };
                break;
        }
        await booking.save();
        return {
            bookingId: booking._id,
            bookingReference: booking.bookingReference,
            previousStatus: booking.status,
            currentStatus: status,
        };
    }
    static async refundBooking(bookingId, amount, reason, refundedBy) {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            throw new Error("Booking not found");
        }
        if (booking.payment.status !== "PAID" &&
            booking.payment.status !== "PARTIAL_REFUND") {
            throw new Error("Only paid bookings can be refunded");
        }
        if (!booking.payment.providerPaymentId) {
            throw new Error("Payment transaction not found");
        }
        const alreadyRefunded = booking.payment.refundAmount || 0;
        const refundableAmount = booking.pricing.grandTotal - alreadyRefunded;
        if (amount <= 0) {
            throw new Error("Refund amount must be greater than zero");
        }
        if (amount > refundableAmount) {
            throw new Error(`Maximum refundable amount is ₹${refundableAmount}`);
        }
        const refundReference = `REF-${Date.now()}`;
        const refundResponse = await CashfreeService.refundPayment({
            orderId: booking.payment.providerOrderId,
            amount,
            refundId: refundReference,
            reason,
        });
        booking.payment.refundAmount = alreadyRefunded + amount;
        booking.payment.refundedAt = new Date();
        booking.payment.refunds = booking.payment.refunds || [];
        booking.payment.refunds.push({
            refundId: refundReference,
            amount,
            reason,
            refundedAt: new Date(),
            providerRefundId: refundResponse.cf_refund_id || refundResponse.refund_id,
            status: refundResponse.refund_status === "SUCCESS" ? "SUCCESS" : "PENDING",
            refundedBy: refundedBy,
        });
        const totalRefunded = (booking.payment.refundAmount || 0) + amount;
        booking.payment.refundAmount = totalRefunded;
        booking.payment.status =
            totalRefunded >= booking.pricing.grandTotal
                ? "REFUNDED"
                : "PARTIAL_REFUND";
        await booking.save();
        return {
            bookingId: booking._id,
            bookingReference: booking.bookingReference,
            paymentStatus: booking.payment.status,
            refundedAmount: amount,
            totalRefunded,
            remainingAmount: booking.pricing.grandTotal - totalRefunded,
        };
    }
    static async expirePendingPayments() {
        const now = new Date();
        const session = await mongoose.startSession();
        try {
            let result = {
                expiredBookings: 0,
                releasedCarts: 0,
            };
            await session.withTransaction(async () => {
                const expiredBookings = await Booking.find({
                    status: "PENDING",
                    "payment.status": "PENDING",
                    paymentExpiresAt: {
                        $lte: now,
                    },
                }, {
                    _id: 1,
                    cartId: 1,
                }).session(session);
                if (!expiredBookings.length) {
                    return;
                }
                const bookingIds = expiredBookings.map((booking) => booking._id);
                const cartIds = expiredBookings
                    .map((booking) => booking.cartId)
                    .filter(Boolean);
                await Cart.updateMany({
                    _id: { $in: cartIds },
                    status: {
                        $in: ["CHECKED_OUT", "CHECKOUT_PENDING"],
                    },
                }, {
                    $unset: {
                        activeBookingId: 1,
                    },
                    $set: {
                        status: "ACTIVE",
                    },
                }, { session });
                const bookingUpdateResult = await Booking.updateMany({
                    _id: {
                        $in: bookingIds,
                    },
                }, {
                    $set: {
                        status: "CANCELLED",
                        "payment.status": "FAILED",
                        "lifecycle.expiredAt": now,
                        "lifecycle.cancelledAt": now,
                        "cancellation.cancelledAt": now,
                        "cancellation.cancelledByRole": "SYSTEM",
                        "cancellation.reason": "Payment expired",
                    },
                    $unset: {
                        paymentExpiresAt: 1,
                    },
                }, {
                    session,
                });
                result = {
                    expiredBookings: bookingUpdateResult.modifiedCount,
                    releasedCarts: cartIds.length,
                };
            });
            return result;
        }
        catch (error) {
            throw new Error(`Failed to expire pending payments: ${error.message}`);
        }
        finally {
            await session.endSession();
        }
    }
}
//# sourceMappingURL=booking.service.js.map