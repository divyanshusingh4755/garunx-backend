import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { CashfreeService } from "./cashfree.service.js";
import { Booking } from "../models/booking.model.js";
import mongoose, { Types } from "mongoose";
import { Cart } from "../models/cart.model.js";
import { Coupon } from "../models/coupon.model.js";
import { ReferralRewardService } from "./referralreward.service.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { User } from "../models/user.model.js";
import { ChatConversationService } from "./chatconversation.service.js";
import { Role } from "../types/rbac.js";
import { OutboxService } from "./outbox.service.js";
import { DOMAIN_EVENTS } from "../events/domain-events.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";
import { HttpError } from "../utils/httpError.js";
import { CoordinatorSelectionConfigService } from "./coordinator-selection-config.service.js";
const COORDINATOR_RESPONSE_TIME_MS = 2 * 60 * 60 * 1000; // for testing only
// const COORDINATOR_RESPONSE_TIME_MS = 10 * 60 * 1000;
const ASSIGNMENT_WINDOW_MS = 2 * 60 * 60 * 1000;
const USER_REASSIGNMENT_CUTOFF_MS = 2 * 60 * 60 * 1000; // 2 hours
// User can manually send at most three coordinator requests in each replacement-selection flow.
const MAX_REASSIGNMENT_USER_REQUESTS = 3;
const MAX_RESCHEDULE_USER_REQUESTS = 3;
const MAX_REASSIGNMENT_COORDINATOR_REQUESTS = 3;
// After USER reassignment manual requests are exhausted (or the selection window expires), the system may try up to three automatic replacement coordinators, one at a time.
const MAX_REASSIGNMENT_AUTO_ATTEMPTS = 3;
const BOOKING_OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_RESENDS = 5;
const MAX_OTP_VERIFICATION_ATTEMPTS = 5;
const STATUS_TRANSITIONS = {
    PENDING_PAYMENT: ["CONFIRMED", "CANCELLED", "EXPIRED"],
    CONFIRMED: ["ASSIGNMENT_PENDING", "CANCELLED"],
    ASSIGNMENT_PENDING: ["CONFIRMED", "ASSIGNED", "CANCELLED"],
    ASSIGNED: ["ASSIGNMENT_PENDING", "IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED"],
    COMPLETED: [],
    CANCELLED: [],
    EXPIRED: ["PENDING_PAYMENT", "CANCELLED"],
};
export class BookingService {
    static getReassignmentManualRequestLimit(requestedByRole) {
        return requestedByRole === "COORDINATOR" ? MAX_REASSIGNMENT_COORDINATOR_REQUESTS : MAX_REASSIGNMENT_USER_REQUESTS;
    }
    static async invalidateBookingCache(bookingId) {
        const operations = [
            RedisCacheService.deleteByPattern(CacheKeys.bookingListPattern()),
            RedisCacheService.delete(CacheKeys.bookingStats()),
        ];
        if (bookingId) {
            operations.push(RedisCacheService.delete(CacheKeys.bookingDetail(bookingId)), RedisCacheService.delete(CacheKeys.bookingInvoice(bookingId)));
        }
        await Promise.all(operations);
    }
    static async assignReplacementCoordinatorRequest(params) {
        const { booking, coordinatorId, requestedBy, assignmentType, session: externalSession } = params;
        if (!booking.assignment || !booking.assignment.reassignment) {
            throw new Error("Active reassignment not found");
        }
        const reassignment = booking.assignment.reassignment;
        if (reassignment.status !== "PENDING_REPLACEMENT" && reassignment.status !== "REPLACEMENT_REQUESTED") {
            throw new Error("Reassignment is not waiting for a replacement");
        }
        const currentCoordinatorId = booking.assignment.assignedCoordinatorId;
        if (!currentCoordinatorId) {
            throw new Error("Current assigned coordinator not found");
        }
        if (currentCoordinatorId.toString() === coordinatorId.toString()) {
            throw new Error("Replacement coordinator must be different from the current coordinator");
        }
        if (!booking.scheduledAt) {
            throw new Error("Booking schedule is required");
        }
        const currentRound = booking.assignment.currentRound ?? 1;
        booking.assignment.requests ??= [];
        const currentRoundRequests = booking.assignment.requests.filter((request) => (request.assignmentRound ?? 1) === currentRound);
        // USER reassignment: allow up to 3 MANUAL requests in parallel. NOMINATED coordinator/admin reassignment remains single-target.
        if (reassignment.mode === "AUTO" && assignmentType === "MANUAL") {
            const manualRequestCount = currentRoundRequests.filter((request) => request.assignmentType === "MANUAL").length;
            const manualRequestLimit = this.getReassignmentManualRequestLimit(reassignment.requestedByRole);
            if (manualRequestCount >= manualRequestLimit) {
                throw new Error(`You can send reassignment requests to a maximum of ${manualRequestLimit} coordinators`);
            }
            // Once automatic fallback has started, manual selection is closed.
            const automaticFallbackStarted = currentRoundRequests.some((request) => request.assignmentType === "AUTO");
            if (automaticFallbackStarted) {
                throw new Error("Automatic replacement assignment has already started");
            }
        }
        if (reassignment.mode === "AUTO" && assignmentType === "AUTO") {
            const autoRequestCount = currentRoundRequests.filter((request) => request.assignmentType === "AUTO").length;
            if (autoRequestCount >= MAX_REASSIGNMENT_AUTO_ATTEMPTS) {
                throw new Error("Maximum automatic reassignment attempts reached");
            }
        }
        const coordinatorObjectId = new Types.ObjectId(coordinatorId.toString());
        const alreadyRequested = currentRoundRequests.some((request) => request.coordinatorId?.toString() === coordinatorObjectId.toString());
        if (alreadyRequested) {
            throw new Error("This coordinator has already received this reassignment request");
        }
        const locationIds = this.getBookingLocationIds(booking);
        if (locationIds.length === 0) {
            throw new Error("No service location found in booking");
        }
        // Revalidate the coordinator at send-time.
        const coordinatorQuery = User.findOne({
            _id: coordinatorObjectId,
            role: "COORDINATOR",
            isActive: true,
            isDocumentVerified: true,
            "coordinatorProfile.approvalStatus": "APPROVED",
            "coordinatorProfile.availabilityStatus": "AVAILABLE",
            "coordinatorProfile.unavailableDates": this.buildCoordinatorUnavailableDateFilter(booking.scheduledAt),
            "coordinatorProfile.serviceableLocations.locationId": { $in: locationIds },
        });
        if (externalSession) {
            coordinatorQuery.session(externalSession);
        }
        const coordinator = await coordinatorQuery;
        if (!coordinator) {
            throw new Error("Replacement coordinator is not available for this booking");
        }
        const startOfDay = new Date(booking.scheduledAt);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(booking.scheduledAt);
        endOfDay.setHours(23, 59, 59, 999);
        const bookedCountQuery = Booking.countDocuments({
            _id: { $ne: booking._id },
            isDeleted: false,
            "assignment.assignedCoordinatorId": coordinatorObjectId,
            scheduledAt: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
        });
        if (externalSession) {
            bookedCountQuery.session(externalSession);
        }
        const bookedCount = await bookedCountQuery;
        const maxDailyBookings = coordinator.coordinatorProfile?.maxDailyBookings ?? 5;
        if (bookedCount >= maxDailyBookings) {
            throw new Error("Replacement coordinator has reached the maximum booking limit for the selected date");
        }
        const now = new Date();
        const responseDeadlineAt = new Date(now.getTime() + COORDINATOR_RESPONSE_TIME_MS);
        booking.assignment.requests.push({
            coordinatorId: coordinatorObjectId,
            status: "PENDING",
            assignmentRound: currentRound,
            assignmentType,
            requestedBy: new Types.ObjectId(requestedBy.toString()),
            requestedAt: now,
            responseDeadlineAt,
            scheduledAt: booking.scheduledAt,
        });
        // NOMINATED reassignment has exactly one intended replacement. AUTO/USER reassignment can have multiple pending coordinators, so replacementCoordinatorId must NOT be overwritten for each pending request. It is written only when a winner accepts.
        if (reassignment.mode === "NOMINATED") {
            reassignment.replacementCoordinatorId = coordinatorObjectId;
        }
        reassignment.status = "REPLACEMENT_REQUESTED";
        const persist = async (session) => {
            await booking.save({ session });
            await OutboxService.createEvent({
                eventId: `BOOKING.ASSIGNMENT_REQUESTED:${booking._id.toString()}:${currentRound}:${coordinatorObjectId.toString()}`,
                eventType: DOMAIN_EVENTS.BOOKING_ASSIGNMENT_REQUESTED,
                aggregateType: "BOOKING",
                aggregateId: booking._id.toString(),
                payload: {
                    bookingId: booking._id.toString(),
                    bookingReference: booking.bookingReference,
                    coordinatorId: coordinatorObjectId.toString(),
                    scheduledAt: booking.scheduledAt,
                    responseDeadlineAt,
                },
                session,
            });
        };
        if (externalSession) {
            await persist(externalSession);
            return booking;
        }
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => { await persist(session); });
        }
        finally {
            await session.endSession();
        }
        return booking;
    }
    static handleFailedReassignmentAttempt(booking, failureReason) {
        const reassignment = booking.assignment?.reassignment;
        if (!reassignment) {
            return;
        }
        const currentRound = booking.assignment.currentRound ?? 1;
        const now = new Date();
        const currentRoundRequests = (booking.assignment.requests ?? []).filter((request) => (request.assignmentRound ?? 1) === currentRound);
        const hasOtherPending = currentRoundRequests.some((request) => request.status === "PENDING");
        // NOMINATED reassignment is intentionally single-target. A rejection/expiry ends this reassignment and the original coordinator remains responsible.
        if (reassignment.mode === "NOMINATED") {
            if (hasOtherPending) {
                reassignment.status = "REPLACEMENT_REQUESTED";
                return;
            }
            reassignment.status = "FAILED";
            reassignment.failedAt = now;
            reassignment.failureReason = failureReason;
            booking.status = "ASSIGNED";
            booking.assignment.status = "ACCEPTED";
            return;
        }
        // USER/AUTO reassignment can have up to three MANUAL requests outstanding at once. If another request is still waiting, keep the reassignment active and do not start fallback assignment yet.
        if (hasOtherPending) {
            reassignment.status = "REPLACEMENT_REQUESTED";
            booking.status = "ASSIGNED";
            booking.assignment.status = "ACCEPTED";
            return;
        }
        // No manual/auto request is currently waiting. PENDING_REPLACEMENT means: - user may still send another MANUAL request if below the limit, OR - processAutoAssignments() may start fallback once the manual limit   is exhausted / selection window expires.
        reassignment.status = "PENDING_REPLACEMENT";
        booking.set("assignment.reassignment.replacementCoordinatorId", undefined);
        booking.status = "ASSIGNED";
        booking.assignment.status = "ACCEPTED";
    }
    static clearAcceptedCoordinator(booking) {
        // Do NOT use: delete booking.assignment.assignedCoordinatorId on Mongoose nested paths. booking.set() ensures Mongoose tracks these paths and persists them as unset.
        booking.set("assignment.assignedCoordinatorId", undefined);
        booking.set("assignment.assignedAt", undefined);
        booking.set("assignment.coordinatorAcceptedAt", undefined);
        booking.set("assignment.responseDeadlineAt", undefined);
    }
    static async confirmSuccessfulPayment(params) {
        const { bookingId, orderId, providerPaymentId, amountPaid, paymentMethod, paidAt = new Date() } = params;
        if (!Types.ObjectId.isValid(bookingId)) {
            throw new Error("Invalid booking ID");
        }
        if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
            throw new Error("Invalid payment amount");
        }
        const session = await mongoose.startSession();
        let paymentConfirmed = false;
        let confirmedUserId = null;
        try {
            await session.withTransaction(async () => {
                // Reload inside transaction. Do not trust a Booking loaded before this transaction.
                const booking = await Booking.findOne({ _id: bookingId, isDeleted: false, "payment.providerOrderId": orderId }).session(session);
                if (!booking) {
                    throw new Error("Booking not found for payment order");
                }
                // Idempotency. Webhook and payment-status polling may arrive at almost the same time.
                if (booking.payment.status === "PAID") {
                    return;
                }
                // Never trust provider/order status without checking the actual paid amount.
                if (Math.abs(amountPaid - booking.pricing.grandTotal) > 0.01) {
                    throw new Error("Payment amount does not match booking total");
                }
                const assignmentExpiresAt = new Date(paidAt.getTime() + ASSIGNMENT_WINDOW_MS);
                const paidUpdate = await Booking.updateOne({ _id: booking._id, "payment.providerOrderId": orderId, "payment.status": { $ne: "PAID" } }, {
                    $set: {
                        "payment.status": "PAID",
                        "payment.amountPaid": amountPaid,
                        "payment.providerPaymentId": providerPaymentId,
                        "payment.gateway": "CASHFREE", ...(paymentMethod ? { "payment.paymentMethod": paymentMethod } : {}),
                        "payment.paidAt": paidAt,
                        status: "CONFIRMED",
                        "assignment.status": "PENDING_SELECTION",
                        "assignment.assignmentExpiresAt": assignmentExpiresAt,
                    },
                    $unset: { paymentExpiresAt: 1, "payment.failureReason": 1 },
                }, { session });
                // Another request won the race.
                if (paidUpdate.modifiedCount === 0) {
                    return;
                }
                // Cart payment state must change together with Booking state.
                await Cart.updateOne({ _id: booking.cartId }, {
                    $set: { status: "CHECKED_OUT", checkedOutAt: paidAt },
                    $unset: { checkoutExpiresAt: 1 },
                }, { session });
                // Coupon usage belongs to the same successful-payment transaction.
                if (booking.pricing.couponId) {
                    await Coupon.updateOne({ _id: booking.pricing.couponId }, { $inc: { usedCount: 1 } }, { session });
                }
                if (booking.userId) {
                    confirmedUserId = booking.userId.toString();
                    await OutboxService.createEvent({
                        eventId: `BOOKING.CONFIRMED:${booking._id.toString()}`,
                        eventType: DOMAIN_EVENTS.BOOKING_CONFIRMED,
                        aggregateType: "BOOKING",
                        aggregateId: booking._id.toString(),
                        payload: {
                            bookingId: booking._id.toString(),
                            bookingReference: booking.bookingReference,
                            userId: confirmedUserId,
                            paidAt,
                            amountPaid,
                            scheduledAt: booking.scheduledAt ?? null,
                        },
                        session,
                    });
                }
                paymentConfirmed = true;
            });
        }
        finally {
            await session.endSession();
        }
        // These should happen only if THIS request actually performed the PAID transition.
        if (paymentConfirmed) {
            await this.invalidateBookingCache(bookingId);
            // Existing method is already designed to ignore MYSELF bookings.
            await this.createBeneficiaryAccess(bookingId);
            if (confirmedUserId) {
                await ReferralRewardService.processReferralReward(confirmedUserId, bookingId);
            }
        }
        return paymentConfirmed;
    }
    static generateOtp() { return crypto.randomInt(100000, 1000000).toString(); }
    static generateBeneficiaryAccessToken() {
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        return { token, tokenHash };
    }
    static hashBeneficiaryAccessToken(token) { return crypto.createHash("sha256").update(token).digest("hex"); }
    static buildServiceExecutions(booking) {
        const serviceExecutions = [];
        for (const entry of booking.entries ?? []) {
            // DIRECT SERVICE
            if (entry.entryType === "SERVICE" && entry.serviceConfiguration?.serviceId) {
                serviceExecutions.push({
                    executionId: crypto.randomUUID(),
                    serviceId: new Types.ObjectId(entry.serviceConfiguration.serviceId.toString()),
                    status: "PENDING",
                });
            }
            // PACKAGE
            if (entry.entryType === "PACKAGE" && entry.packageConfiguration) {
                const packageServices = [
                    ...(entry.packageConfiguration.selectedServices ?? []),
                    ...(entry.packageConfiguration.addonServices ?? []),
                ];
                for (const service of packageServices) {
                    if (!service.serviceId) {
                        continue;
                    }
                    serviceExecutions.push({
                        executionId: crypto.randomUUID(),
                        serviceId: new Types.ObjectId(service.serviceId.toString()),
                        status: "PENDING",
                    });
                }
            }
        }
        return serviceExecutions;
    }
    static async validateBookingOtp(booking, otp) {
        const otpVerification = booking.execution?.otpVerification;
        if (!otpVerification?.otpHash) {
            throw new Error("Booking OTP has not been generated");
        }
        if (!otpVerification.expiresAt) {
            throw new Error("Booking OTP expiry is missing");
        }
        if (otpVerification.status === "VERIFIED") {
            throw new Error("Booking OTP has already been verified");
        }
        if (otpVerification.attempts >= MAX_OTP_VERIFICATION_ATTEMPTS) {
            throw new Error("Maximum OTP verification attempts exceeded");
        }
        if (otpVerification.expiresAt <= new Date()) {
            otpVerification.status = "EXPIRED";
            await booking.save();
            throw new Error("Booking OTP has expired");
        }
        return bcrypt.compare(otp, otpVerification.otpHash);
    }
    static getBookingLocationIds(booking) {
        const locationIds = new Set();
        for (const entry of booking.entries ?? []) {
            if (entry.entryType === "SERVICE" && entry.serviceConfiguration?.location?.locationId) {
                locationIds.add(entry.serviceConfiguration.location.locationId.toString());
            }
            if (entry.entryType === "PACKAGE" && entry.packageConfiguration) {
                const packageServices = [
                    ...(entry.packageConfiguration.selectedServices ?? []),
                    ...(entry.packageConfiguration.addonServices ?? []),
                ];
                for (const service of packageServices) {
                    if (service.location?.locationId) {
                        locationIds.add(service.location.locationId.toString());
                    }
                }
            }
        }
        return Array.from(locationIds).map((locationId) => new Types.ObjectId(locationId));
    }
    static getRequestedCoordinatorIds(booking, scheduledAt, assignmentRound) {
        if (!scheduledAt) {
            return [];
        }
        const requests = booking.assignment?.requests ?? [];
        const currentRound = assignmentRound ?? booking.assignment?.currentRound ?? 1;
        const targetDate = new Date(scheduledAt);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        return requests.filter((request) => (request.assignmentRound ?? 1) === currentRound && request.scheduledAt && request.scheduledAt >= startOfDay && request.scheduledAt <= endOfDay).map((request) => request.coordinatorId).filter(Boolean).map((coordinatorId) => new Types.ObjectId(coordinatorId.toString()));
    }
    static getUnavailableDateRange(scheduledAt) {
        const date = new Date(scheduledAt);
        if (Number.isNaN(date.getTime())) {
            throw new Error("Invalid scheduled date");
        }
        // UnavailableDates are stored as normalized UTC calendar dates: 2026-09-10 => 2026-09-10T00:00:00.000Z. Therefore use UTC boundaries here
        const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const endOfDay = new Date(startOfDay);
        endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
        return { startOfDay, endOfDay };
    }
    static buildCoordinatorUnavailableDateFilter(scheduledAt) {
        const { startOfDay, endOfDay } = this.getUnavailableDateRange(scheduledAt);
        return { $not: { $elemMatch: { $gte: startOfDay, $lt: endOfDay } } };
    }
    static async findNextAvailableCoordinator(booking, excludedCoordinatorIds = [], scheduledAt) {
        const locationIds = this.getBookingLocationIds(booking);
        const targetScheduledAt = scheduledAt ?? booking.scheduledAt;
        if (!targetScheduledAt) {
            return null;
        }
        const query = {
            role: "COORDINATOR",
            isActive: true,
            isDocumentVerified: true,
            "coordinatorProfile.approvalStatus": "APPROVED",
            "coordinatorProfile.availabilityStatus": "AVAILABLE",
            "coordinatorProfile.autoAssignmentEnabled": true,
            "coordinatorProfile.unavailableDates": this.buildCoordinatorUnavailableDateFilter(targetScheduledAt),
        };
        if (locationIds.length > 0) {
            query["coordinatorProfile.serviceableLocations.locationId"] = { $in: locationIds };
        }
        if (excludedCoordinatorIds.length > 0) {
            query._id = { $nin: excludedCoordinatorIds };
        }
        const candidates = await User.find(query).sort({ "coordinatorProfile.averageRating": -1, "coordinatorProfile.totalAssignedBookings": 1 }).limit(20).lean();
        if (!candidates.length) {
            return null;
        }
        const scheduledDate = new Date(targetScheduledAt);
        const startOfDay = new Date(scheduledDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(scheduledDate);
        endOfDay.setHours(23, 59, 59, 999);
        for (const coordinator of candidates) {
            const assignedBookings = await Booking.countDocuments({
                isDeleted: false,
                "assignment.assignedCoordinatorId": coordinator._id,
                scheduledAt: { $gte: startOfDay, $lte: endOfDay },
                status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
            });
            const maximumBookings = coordinator.coordinatorProfile?.maxDailyBookings ?? 5;
            if (assignedBookings < maximumBookings) {
                return coordinator;
            }
        }
        return null;
    }
    static async assignCoordinatorRequest(params) {
        const { booking, coordinatorId, selectedBy, assignmentType, scheduledAt } = params;
        const now = new Date();
        const responseDeadlineAt = new Date(now.getTime() + COORDINATOR_RESPONSE_TIME_MS);
        booking.assignment ??= { status: "NOT_STARTED", currentRound: 1, requests: [] };
        booking.assignment.requests ??= [];
        booking.assignment.currentRound ??= 1;
        const targetScheduledAt = scheduledAt ?? booking.scheduledAt;
        if (!targetScheduledAt) {
            throw new Error("Booking schedule is required");
        }
        const coordinatorObjectId = new Types.ObjectId(coordinatorId.toString());
        // Reschedule coordinator-change flow: user may manually send requests to at most 3 coordinators in the same reschedule assignment round.
        const pendingReschedule = booking.assignment.pendingReschedule;
        const isCurrentRescheduleRound = assignmentType === "MANUAL" && pendingReschedule && pendingReschedule.assignmentRound === booking.assignment.currentRound && pendingReschedule.requestedScheduledAt?.getTime() === targetScheduledAt.getTime();
        if (isCurrentRescheduleRound) {
            const manualRescheduleRequests = booking.assignment.requests.filter((request) => (request.assignmentRound ?? 1) === booking.assignment.currentRound && request.assignmentType === "MANUAL");
            if (manualRescheduleRequests.length >= MAX_RESCHEDULE_USER_REQUESTS) {
                throw new Error(`You can send reschedule requests to a maximum of ${MAX_RESCHEDULE_USER_REQUESTS} coordinators`);
            }
            // After automatic fallback begins, user manual selection is closed.
            const automaticFallbackStarted = booking.assignment.requests.some((request) => (request.assignmentRound ?? 1) === booking.assignment.currentRound && request.assignmentType === "AUTO");
            if (automaticFallbackStarted) {
                throw new Error("Automatic coordinator assignment has already started for this reschedule");
            }
        }
        const duplicateRequest = booking.assignment.requests.find((request) => request.coordinatorId?.toString() === coordinatorObjectId.toString() && (request.assignmentRound ?? 1) === booking.assignment.currentRound);
        if (duplicateRequest) {
            throw new Error("This coordinator has already received this booking request in the current assignment round");
        }
        booking.assignment.requests.push({
            coordinatorId: coordinatorObjectId,
            status: "PENDING",
            assignmentRound: booking.assignment.currentRound,
            assignmentType,
            requestedBy: selectedBy ? new Types.ObjectId(selectedBy.toString()) : undefined,
            requestedAt: now,
            responseDeadlineAt,
            scheduledAt: targetScheduledAt,
        });
        booking.assignment.status = "PENDING_RESPONSE";
        booking.assignment.assignmentType = assignmentType;
        booking.assignment.assignedBy = selectedBy ? new Types.ObjectId(selectedBy.toString()) : undefined;
        // Manual customer-selection window is over
        // once any coordinator request is sent.
        booking.set("assignment.assignmentExpiresAt", undefined);
        // Release any previously accepted coordinator. This is required for: - normal reassignment - reschedule with coordinator change - any new assignment round The next coordinator must be able to atomically claim this booking.
        this.clearAcceptedCoordinator(booking);
        booking.status = "ASSIGNMENT_PENDING";
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                await booking.save({ session });
                await OutboxService.createEvent({
                    eventId: `BOOKING.ASSIGNMENT_REQUESTED:${booking._id.toString()}:${booking.assignment.currentRound}:${coordinatorObjectId.toString()}`,
                    eventType: DOMAIN_EVENTS.BOOKING_ASSIGNMENT_REQUESTED,
                    aggregateType: "BOOKING",
                    aggregateId: booking._id.toString(),
                    payload: {
                        bookingId: booking._id.toString(),
                        bookingReference: booking.bookingReference,
                        coordinatorId: coordinatorObjectId.toString(),
                        scheduledAt: targetScheduledAt,
                        responseDeadlineAt,
                    },
                    session,
                });
            });
        }
        finally {
            await session.endSession();
        }
        return booking;
    }
    static calculateExecutionProgress(serviceExecutions) {
        if (!serviceExecutions.length) {
            return 0;
        }
        const resolvedServices = serviceExecutions.filter((service) => service.status === "COMPLETED" || service.status === "SKIPPED" || service.status === "CANCELLED").length;
        return Math.round((resolvedServices / serviceExecutions.length) * 100);
    }
    static addMilestoneIfMissing(booking, code, completedBy, notes) {
        booking.execution ??= { stage: "NOT_STARTED", serviceExecutions: [], milestones: [], progressPercentage: 0 };
        booking.execution.milestones ??= [];
        const alreadyExists = booking.execution.milestones.some((milestone) => milestone.code === code);
        if (alreadyExists) {
            return;
        }
        booking.execution.milestones.push({
            code,
            completedAt: new Date(),
            completedBy: completedBy ? new Types.ObjectId(completedBy.toString()) : undefined,
            notes,
        });
    }
    static async process(req) {
        const rawBody = req.body.toString("utf-8");
        const signature = req.header("x-webhook-signature") || "";
        const timestamp = req.header("x-webhook-timestamp") || "";
        const valid = CashfreeService.verifyWebhookSignature(rawBody, signature, timestamp);
        if (!valid) {
            const error = new Error("Invalid webhook signature");
            error.statusCode = 401;
            throw error;
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
        const booking = await Booking.findOne({ "payment.providerOrderId": orderId });
        if (!booking) {
            throw new Error(`Booking not found for ${orderId}`);
        }
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                if (paymentStatus === "SUCCESS") {
                    const numericPaymentAmount = Number(paymentAmount);
                    if (!Number.isFinite(numericPaymentAmount)) {
                        throw new Error("Invalid payment amount received from Cashfree");
                    }
                    if (!paymentId) {
                        throw new Error("Missing Cashfree payment ID");
                    }
                    await this.confirmSuccessfulPayment({
                        bookingId: booking._id.toString(),
                        orderId,
                        providerPaymentId: String(paymentId),
                        amountPaid: numericPaymentAmount,
                        ...(typeof paymentGroup === "string" && paymentGroup ? { paymentMethod: paymentGroup } : {}),
                    });
                    return;
                }
                if (paymentStatus === "FAILED") {
                    const failedUpdate = await Booking.updateOne({ _id: booking._id, "payment.status": { $ne: "FAILED" } }, { $set: { "payment.status": "FAILED", "payment.failureReason": "Payment failed" } }, { session });
                    if (failedUpdate.modifiedCount > 0 && booking.userId) {
                        await OutboxService.createEvent({
                            eventId: `PAYMENT.FAILED:${booking._id.toString()}:${paymentId ?? orderId}`,
                            eventType: DOMAIN_EVENTS.PAYMENT_FAILED,
                            aggregateType: "BOOKING",
                            aggregateId: booking._id.toString(),
                            payload: {
                                bookingId: booking._id.toString(),
                                bookingReference: booking.bookingReference,
                                userId: booking.userId.toString(),
                                reason: "Payment failed",
                            },
                            session,
                        });
                    }
                    return;
                }
                await this.invalidateBookingCache(booking._id.toString());
                await Booking.updateOne({ _id: booking._id }, { $set: { "payment.status": "PENDING" } }, { session });
            });
            if (paymentStatus === "SUCCESS" && booking.userId) {
                await ReferralRewardService.processReferralReward(booking.userId.toString(), booking._id.toString());
            }
        }
        catch (error) {
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    static async retryPayment(bookingId, userId) {
        if (!Types.ObjectId.isValid(bookingId) || !Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid booking or user ID");
        }
        const booking = await Booking.findOne({ _id: bookingId, userId, isDeleted: false });
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
                    orderId: booking.payment.providerOrderId,
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
        const now = new Date();
        const paymentExpiresAt = new Date(now.getTime() + 30 * 60 * 1000);
        await Booking.updateOne({ _id: booking._id }, {
            $set: {
                status: "PENDING_PAYMENT",
                paymentExpiresAt,
                "payment.status": "PENDING",
                "payment.providerOrderId": order.order_id,
                "payment.paymentSessionId": order.payment_session_id,
                "payment.lastAttemptAt": now,
                "assignment.status": "NOT_STARTED",
            },
            $unset: { "payment.failureReason": 1 },
            $inc: { "payment.attempts": 1 },
        });
        await this.invalidateBookingCache(bookingId);
        return {
            orderId: order.order_id,
            paymentSessionId: order.payment_session_id,
        };
    }
    static async getPaymentStatus(cartId, userId) {
        if (!Types.ObjectId.isValid(cartId) || !Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid cart or user ID");
        }
        const cart = await Cart.findOne({ _id: cartId, userId });
        if (!cart?.activeBookingId) {
            return { hasPendingPayment: false, paymentStatus: null, bookingStatus: null };
        }
        const booking = await Booking.findOne({ _id: cart.activeBookingId, userId, isDeleted: false });
        if (!booking) {
            return { hasPendingPayment: false, paymentStatus: null, bookingStatus: null };
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
        let syncedPaidAt;
        // Sync DB if needed
        if (cashfreeStatus === "PAID" && booking.payment.status !== "PAID" && booking.payment.providerOrderId) {
            const successfulPayment = await CashfreeService.getSuccessfulPaymentForOrder(booking.payment.providerOrderId);
            // Do NOT mark the Booking PAID just because order_status says PAID if the actual successful payment transaction cannot be obtained.
            if (successfulPayment) {
                const paidAtRaw = successfulPayment.payment_completion_time ?? successfulPayment.payment_time;
                const paidAt = paidAtRaw && !Number.isNaN(new Date(paidAtRaw).getTime()) ? new Date(paidAtRaw) : new Date();
                await this.confirmSuccessfulPayment({
                    bookingId: booking._id.toString(),
                    orderId: booking.payment.providerOrderId,
                    providerPaymentId: String(successfulPayment.cf_payment_id),
                    amountPaid: Number(successfulPayment.payment_amount),
                    ...(successfulPayment.payment_group ? { paymentMethod: successfulPayment.payment_group } : {}),
                    paidAt,
                });
                // Refresh because confirmSuccessfulPayment wrote the actual database state.
                const refreshed = await Booking.findById(booking._id).select("status payment").lean();
                if (refreshed) {
                    booking.status = refreshed.status;
                    booking.payment.status = refreshed.payment.status;
                    if (refreshed.payment.paidAt !== undefined) {
                        booking.payment.paidAt = refreshed.payment.paidAt;
                    }
                    else {
                        delete booking.payment.paidAt;
                    }
                    if (refreshed.payment.providerPaymentId !== undefined) {
                        booking.payment.providerPaymentId = refreshed.payment.providerPaymentId;
                    }
                    else {
                        delete booking.payment.providerPaymentId;
                    }
                    if (refreshed.payment.amountPaid !== undefined) {
                        booking.payment.amountPaid = refreshed.payment.amountPaid;
                    }
                    else {
                        delete booking.payment.amountPaid;
                    }
                }
            }
        }
        const hasPending = cashfreeStatus === "ACTIVE" || cashfreeStatus === "PENDING";
        const canRetry = cashfreeStatus === "EXPIRED" || cashfreeStatus === "FAILED" || cashfreeStatus === "UNKNOWN";
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
        const { searchTerm, status, paymentStatus, userId, accessibleByUserId, bookingReference, fromDate, toDate, limit = 20, page = 1, sortBy = "createdAt", sortOrder = "desc", includeCoordinatorProfile = true } = params;
        // Normalize pagination
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
        // Validate IDs before Redis lookup Invalid requests should not generate cache keys / cache entries.
        if (userId && !Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }
        if (accessibleByUserId && !Types.ObjectId.isValid(accessibleByUserId)) {
            throw new Error("Invalid accessible user ID");
        }
        // Normalize sorting 
        const allowedSortFields = new Set(["createdAt", "updatedAt", "scheduledAt", "status", "bookingReference", "pricing.grandTotal", "payment.status"]);
        const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "createdAt";
        //  Build Redis cache key  Use effective values rather than raw pagination / sorting values.
        const cacheKey = CacheKeys.bookingList({ searchTerm, status, paymentStatus, userId, accessibleByUserId, bookingReference, fromDate, toDate, limit: safeLimit, page: safePage, sortBy: safeSortBy, sortOrder, includeCoordinatorProfile });
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS.BOOKING_LIST,
            loader: async () => {
                try {
                    const skip = (safePage - 1) * safeLimit;
                    // Build booking query
                    const andConditions = [];
                    const query = { isDeleted: false };
                    // Booking status
                    if (status) {
                        query.status = status;
                    }
                    // Payment status
                    if (paymentStatus) {
                        query["payment.status"] = paymentStatus;
                    }
                    // Exact owner
                    if (userId) {
                        query.userId = new Types.ObjectId(userId);
                    }
                    // User can access booking either as purchaser/owner or beneficiary.
                    if (accessibleByUserId) {
                        const userObjectId = new Types.ObjectId(accessibleByUserId);
                        andConditions.push({
                            $or: [
                                { userId: userObjectId },
                                { beneficiaryUserId: userObjectId },
                            ],
                        });
                    }
                    // Exact booking reference
                    if (bookingReference) {
                        query.bookingReference = bookingReference;
                    }
                    //  Created date filter
                    if (fromDate || toDate) {
                        query.createdAt = {};
                        if (fromDate) {
                            query.createdAt.$gte = new Date(fromDate);
                        }
                        if (toDate) {
                            query.createdAt.$lte = new Date(toDate);
                        }
                    }
                    //  Search  Search booking reference and customer information.
                    if (searchTerm?.trim()) {
                        const term = escapeRegex(searchTerm.trim());
                        andConditions.push({
                            $or: [
                                { bookingReference: { $regex: term, $options: "i" } },
                                { "customerDetails.name": { $regex: term, $options: "i" } },
                                { "customerDetails.email": { $regex: term, $options: "i" } },
                                { "customerDetails.phone": { $regex: term, $options: "i" } },
                            ],
                        });
                    }
                    if (andConditions.length > 0) {
                        query.$and = andConditions;
                    }
                    //  Sorting
                    const sortCriteria = {};
                    sortCriteria[safeSortBy] = sortOrder === "asc" ? 1 : -1;
                    // Stable secondary sorting.
                    if (safeSortBy !== "createdAt") {
                        sortCriteria.createdAt = -1;
                    }
                    // Build Mongo query
                    let bookingQuery = Booking.find(query).populate("userId", "fullName email phoneNumber").populate("cartId", "totalAmount status");
                    // Coordinator population is optional because some APIs don't require all coordinator profile details.
                    if (includeCoordinatorProfile) {
                        bookingQuery = bookingQuery.populate({
                            path: "assignment.assignedCoordinatorId",
                            select: {
                                fullName: 1,
                                profileImage: 1,
                                phoneNumber: 1,
                                gender: 1,
                                caste: 1,
                                gotra: 1,
                                userReference: 1,
                                "coordinatorProfile.averageRating": 1,
                                "coordinatorProfile.totalRatings": 1,
                                "coordinatorProfile.totalCompletedBookings": 1,
                                "coordinatorProfile.availabilityStatus": 1,
                            },
                        }).populate({
                            path: "assignment.requests.coordinatorId",
                            select: {
                                fullName: 1,
                                profileImage: 1,
                                phoneNumber: 1,
                                gender: 1,
                                caste: 1,
                                gotra: 1,
                                userReference: 1,
                                "coordinatorProfile.averageRating": 1,
                                "coordinatorProfile.totalRatings": 1,
                                "coordinatorProfile.totalCompletedBookings": 1,
                                "coordinatorProfile.availabilityStatus": 1,
                            },
                        });
                    }
                    //  Execute list + count concurrently
                    const [data, total] = await Promise.all([
                        bookingQuery.sort(sortCriteria).skip(skip).limit(safeLimit).lean(),
                        Booking.countDocuments(query),
                    ]);
                    //  Format booking response
                    const formattedData = data.map((booking) => {
                        const assignment = booking.assignment;
                        const assignedCoordinator = assignment?.assignedCoordinatorId;
                        // Determine whether Mongoose populated the coordinator.
                        const isAssignedCoordinatorPopulated = includeCoordinatorProfile && assignedCoordinator && typeof assignedCoordinator === "object" && "_id" in assignedCoordinator;
                        // Keep assignedCoordinatorId as actual ObjectId.
                        const assignedCoordinatorId = isAssignedCoordinatorPopulated ? assignedCoordinator._id : (assignedCoordinator ?? null);
                        // Build coordinator profile only when populated.
                        const coordinator = isAssignedCoordinatorPopulated ? {
                            coordinatorId: assignedCoordinator._id,
                            fullName: assignedCoordinator.fullName,
                            profileImage: assignedCoordinator.profileImage,
                            phoneNumber: assignedCoordinator.phoneNumber,
                            gender: assignedCoordinator.gender,
                            userReference: assignedCoordinator.userReference,
                            caste: assignedCoordinator.caste,
                            gotra: assignedCoordinator.gotra,
                            rating: {
                                averageRating: assignedCoordinator.coordinatorProfile?.averageRating ?? 0,
                                totalRatings: assignedCoordinator.coordinatorProfile?.totalRatings ?? 0,
                            },
                            experience: { totalCompletedBookings: assignedCoordinator.coordinatorProfile?.totalCompletedBookings ?? 0 },
                            availabilityStatus: assignedCoordinator.coordinatorProfile?.availabilityStatus,
                        } : null;
                        // Format coordinator requests.
                        const coordinatorRequests = assignment?.requests?.map((request) => {
                            const requestedCoordinator = request.coordinatorId;
                            const isRequestedCoordinatorPopulated = includeCoordinatorProfile && requestedCoordinator && typeof requestedCoordinator === "object" && "_id" in requestedCoordinator;
                            const requestedCoordinatorId = isRequestedCoordinatorPopulated ? requestedCoordinator._id : (requestedCoordinator ?? null);
                            return {
                                requestId: request._id,
                                coordinatorId: requestedCoordinatorId,
                                status: request.status,
                                assignmentType: request.assignmentType,
                                requestedAt: request.requestedAt,
                                responseDeadlineAt: request.responseDeadlineAt,
                                respondedAt: request.respondedAt,
                                rejectionReason: request.rejectionReason,
                                coordinator: isRequestedCoordinatorPopulated ? {
                                    coordinatorId: requestedCoordinator._id,
                                    fullName: requestedCoordinator.fullName,
                                    profileImage: requestedCoordinator.profileImage,
                                    phoneNumber: requestedCoordinator.phoneNumber,
                                    gender: requestedCoordinator.gender,
                                    userReference: requestedCoordinator.userReference,
                                    caste: requestedCoordinator.caste,
                                    gotra: requestedCoordinator.gotra,
                                    rating: {
                                        averageRating: requestedCoordinator.coordinatorProfile?.averageRating ?? 0,
                                        totalRatings: requestedCoordinator.coordinatorProfile?.totalRatings ?? 0,
                                    },
                                    experience: { totalCompletedBookings: requestedCoordinator.coordinatorProfile?.totalCompletedBookings ?? 0 },
                                    availabilityStatus: requestedCoordinator.coordinatorProfile?.availabilityStatus,
                                } : null,
                            };
                        }) ?? [];
                        // Remove original assignment so we can rebuild it with normalized coordinator values.
                        const { assignment: _assignment, ...bookingData } = booking;
                        return {
                            ...bookingData,
                            assignment: assignment ? { ...assignment, assignedCoordinatorId, requests: coordinatorRequests } : null,
                            coordinator: includeCoordinatorProfile ? coordinator : null,
                        };
                    });
                    return { data: formattedData, total, page: safePage, totalPages: Math.ceil(total / safeLimit) };
                }
                catch (error) {
                    throw new Error(`Booking fetch failed: ${error.message}`);
                }
            },
        });
    }
    static async getBookingById(bookingId) {
        if (!bookingId) {
            throw new Error("Booking ID is required");
        }
        if (!Types.ObjectId.isValid(bookingId)) {
            throw new Error("Invalid booking ID");
        }
        return RedisCacheService.getOrSet({
            key: CacheKeys.bookingDetail(bookingId),
            ttlSeconds: CACHE_TTL_SECONDS.BOOKING_DETAIL,
            loader: async () => {
                const booking = await Booking.findById(bookingId).populate("userId", "fullName email phoneNumber").populate("assignment.assignedCoordinatorId", "fullName email phoneNumber").lean();
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
                    assignment: booking.assignment,
                    cancellation: booking.cancellation,
                    execution: booking.execution,
                    createdAt: booking.createdAt,
                    updatedAt: booking.updatedAt,
                };
            },
        });
    }
    static async getBookingStats() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const [bookingStats, paymentStats, revenueStats, todayBookings, thisMonthBookings] = await Promise.all([
                Booking.aggregate([
                    { $match: { isDeleted: false } },
                    { $group: { _id: "$status", count: { $sum: 1 } } },
                ]),
                Booking.aggregate([
                    { $match: { isDeleted: false } },
                    { $group: { _id: "$payment.status", count: { $sum: 1 } } },
                ]),
                Booking.aggregate([
                    { $match: { isDeleted: false } },
                    { $group: { _id: null, totalRevenue: { $sum: { $cond: [{ $eq: ["$payment.status", "PAID"] }, "$pricing.grandTotal", 0] } }, refundedAmount: { $sum: "$payment.refundAmount" } } },
                ]),
                Booking.countDocuments({ isDeleted: false, createdAt: { $gte: today } }),
                Booking.countDocuments({ isDeleted: false, createdAt: { $gte: monthStart } }),
            ]);
            const bookingMap = Object.fromEntries(bookingStats.map((item) => [item._id, item.count]));
            const paymentMap = Object.fromEntries(paymentStats.map((item) => [item._id, item.count]));
            return {
                totalBookings: Object.values(bookingMap).reduce((sum, count) => sum + count, 0),
                pendingPaymentBookings: bookingMap.PENDING_PAYMENT || 0,
                confirmedBookings: bookingMap.CONFIRMED || 0,
                assignmentPendingBookings: bookingMap.ASSIGNMENT_PENDING || 0,
                assignedBookings: bookingMap.ASSIGNED || 0,
                inProgressBookings: bookingMap.IN_PROGRESS || 0,
                completedBookings: bookingMap.COMPLETED || 0,
                cancelledBookings: bookingMap.CANCELLED || 0,
                expiredBookings: bookingMap.EXPIRED || 0,
                pendingPayments: paymentMap.PENDING || 0,
                processingPayments: paymentMap.PROCESSING || 0,
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
    static async searchBookings(searchQuery) {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        return await Booking.find({
            isDeleted: false,
            $or: [
                { "customerDetails.email": normalizedQuery },
                { "customerDetails.phone": normalizedQuery },
                { "cartSnapshot.customerDetails.email": normalizedQuery },
                { "cartSnapshot.customerDetails.phone": normalizedQuery },
            ],
        }).populate("userId", "fullName email phoneNumber");
    }
    static async updateBookingNotes(bookingId, notes, userId) {
        if (!bookingId) {
            throw new Error("Booking ID is required");
        }
        if (typeof notes !== "string") {
            throw new Error("Notes must be a string");
        }
        if (!Types.ObjectId.isValid(bookingId) || !Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid booking or user ID");
        }
        const booking = await Booking.findOne({ _id: bookingId, userId, isDeleted: false });
        if (!booking) {
            throw new Error("Booking not found");
        }
        if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
            throw new Error(`Cannot update notes for ${booking.status.toLowerCase()} booking`);
        }
        booking.notes = notes.trim();
        await booking.save();
        await this.invalidateBookingCache(bookingId);
        return { bookingId: booking._id, notes: booking.notes };
    }
    static async rescheduleBooking(params) {
        const { bookingId, scheduledAt, reason, userId, role } = params;
        if (!bookingId) {
            throw new Error("Booking ID is required");
        }
        if (!scheduledAt) {
            throw new Error("New scheduled date is required");
        }
        if (!reason?.trim()) {
            throw new Error("Reschedule reason is required");
        }
        const booking = await Booking.findOne({ _id: bookingId, isDeleted: false });
        if (!booking) {
            throw new Error("Booking not found");
        }
        const isOwner = booking.userId?.toString() === userId;
        const isAdmin = role === "ADMIN" || role === "SUBADMIN";
        if (!isOwner && !isAdmin) {
            throw new Error("You are not authorized to reschedule this booking");
        }
        if (!["CONFIRMED", "ASSIGNMENT_PENDING", "ASSIGNED"].includes(booking.status)) {
            throw new Error(`Cannot reschedule booking with status ${booking.status}`);
        }
        if (booking.payment.status !== "PAID") {
            throw new Error("Only paid bookings can be rescheduled");
        }
        if (booking.execution?.startedAt || booking.status === "IN_PROGRESS") {
            throw new Error("Booking cannot be rescheduled after execution has started");
        }
        const activeReassignment = booking.assignment?.reassignment;
        if (activeReassignment && ["PENDING_REPLACEMENT", "REPLACEMENT_REQUESTED"].includes(activeReassignment.status)) {
            throw new Error("Booking cannot be rescheduled while reassignment is in progress");
        }
        const newSchedule = new Date(scheduledAt);
        if (Number.isNaN(newSchedule.getTime())) {
            throw new Error("Invalid scheduled date");
        }
        const now = new Date();
        if (newSchedule <= now) {
            throw new Error("Scheduled date must be in the future");
        }
        if (booking.scheduledAt && booking.scheduledAt.getTime() === newSchedule.getTime()) {
            throw new Error("New scheduled date must be different from current schedule");
        }
        // CHECK CURRENT ASSIGNED COORDINATOR If this booking already has an accepted coordinator, first check whether that SAME coordinator can continue with the booking on the requested new date. If yes: - keep the same coordinator - immediately commit the new date - do NOT send another assignment request If no: - keep current booking/date/assignment unchanged - return requiresCoordinatorChange = true - frontend can fetch coordinators for the new date
        const coordinatorId = booking.assignment?.assignedCoordinatorId;
        if (booking.status === "ASSIGNED" && coordinatorId) {
            const coordinator = await User.findById(coordinatorId).select({
                role: 1,
                isActive: 1,
                isDocumentVerified: 1,
                fullName: 1,
                profileImage: 1,
                userReference: 1,
                "coordinatorProfile.approvalStatus": 1,
                "coordinatorProfile.availabilityStatus": 1,
                "coordinatorProfile.unavailableDates": 1,
                "coordinatorProfile.averageRating": 1,
                "coordinatorProfile.totalRatings": 1,
                "coordinatorProfile.totalCompletedBookings": 1,
                "coordinatorProfile.maxDailyBookings": 1,
            }).lean();
            if (!coordinator) {
                throw new Error("Assigned coordinator not found");
            }
            const { startOfDay: unavailableStart, endOfDay: unavailableEnd } = this.getUnavailableDateRange(newSchedule);
            const coordinatorUnavailableOnDate = (coordinator.coordinatorProfile?.unavailableDates ?? []).some((unavailableDate) => {
                const date = new Date(unavailableDate);
                return (date >= unavailableStart && date < unavailableEnd);
            });
            // Coordinator must still be eligible to handle bookings.
            const coordinatorOperationallyAvailable = coordinator.role === "COORDINATOR" && coordinator.isActive === true && coordinator.isDocumentVerified === true && coordinator.coordinatorProfile?.approvalStatus === "APPROVED" && coordinator.coordinatorProfile?.availabilityStatus === "AVAILABLE" && !coordinatorUnavailableOnDate;
            // Check daily booking capacity on the requested NEW schedule date.
            let hasScheduleCapacity = false;
            if (coordinatorOperationallyAvailable) {
                const startOfDay = new Date(newSchedule);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(newSchedule);
                endOfDay.setHours(23, 59, 59, 999);
                const assignedBookings = await Booking.countDocuments({
                    // Do not count the same booking.
                    _id: { $ne: booking._id },
                    isDeleted: false,
                    "assignment.assignedCoordinatorId": coordinatorId,
                    scheduledAt: { $gte: startOfDay, $lte: endOfDay },
                    status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
                });
                const maxDailyBookings = coordinator.coordinatorProfile?.maxDailyBookings ?? 5;
                hasScheduleCapacity = assignedBookings < maxDailyBookings;
            }
            const coordinatorAvailable = coordinatorOperationallyAvailable && hasScheduleCapacity;
            // Current coordinator cannot currently serve the requested date. IMPORTANT: We do NOT: - change scheduledAt - remove current coordinator - change old ACCEPTED request - create pendingReschedule yet Nothing changes until the customer actually chooses a replacement.
            if (!coordinatorAvailable) {
                return {
                    rescheduled: false,
                    requiresCoordinatorChange: true,
                    bookingId: booking._id,
                    bookingReference: booking.bookingReference,
                    bookingStatus: booking.status,
                    currentScheduledAt: booking.scheduledAt,
                    requestedScheduledAt: newSchedule,
                    reason: reason.trim(),
                    currentCoordinator: {
                        coordinatorId: coordinator._id,
                        fullName: coordinator.fullName,
                        profileImage: coordinator.profileImage,
                        userReference: coordinator.userReference,
                        availabilityStatus: coordinator.coordinatorProfile?.availabilityStatus,
                        rating: {
                            averageRating: coordinator.coordinatorProfile?.averageRating ?? 0,
                            totalRatings: coordinator.coordinatorProfile?.totalRatings ?? 0,
                        },
                        experience: {
                            totalCompletedBookings: coordinator.coordinatorProfile?.totalCompletedBookings ?? 0,
                        },
                    },
                    message: "Current coordinator is not available on the selected date. Please select another coordinator.",
                };
            }
            // If execution reaches here: SAME coordinator is still: - COORDINATOR - active - document verified - approved - AVAILABLE - under booking capacity Therefore we simply retain the existing accepted coordinator. No assignment request is required.
        }
        // COMMIT RESCHEDULE Reaches here when: 1. Existing coordinator is available,    so we retain them automatically. OR 2. Booking does not currently have    an accepted coordinator.
        const previousScheduledAt = booking.scheduledAt;
        booking.scheduledAt = newSchedule;
        booking.rescheduleHistory ??= [];
        const rescheduleEntry = {
            newScheduledAt: newSchedule,
            reason: reason.trim(),
            rescheduledBy: new Types.ObjectId(userId),
            rescheduledByRole: role,
            rescheduledAt: now,
        };
        if (previousScheduledAt) {
            rescheduleEntry.previousScheduledAt = previousScheduledAt;
        }
        booking.rescheduleHistory.push(rescheduleEntry);
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                await booking.save({ session });
                if (booking.userId) {
                    await OutboxService.createEvent({
                        eventId: `BOOKING.RESCHEDULED:${booking._id.toString()}:${newSchedule.getTime()}`,
                        eventType: DOMAIN_EVENTS.BOOKING_RESCHEDULED,
                        aggregateType: "BOOKING",
                        aggregateId: booking._id.toString(),
                        payload: {
                            bookingId: booking._id.toString(),
                            bookingReference: booking.bookingReference,
                            userId: booking.userId.toString(),
                            coordinatorId: booking.assignment?.assignedCoordinatorId?.toString() ?? null,
                            previousScheduledAt: previousScheduledAt ?? null,
                            scheduledAt: newSchedule,
                            reason: reason.trim(),
                        },
                        session,
                    });
                }
            });
        }
        finally {
            await session.endSession();
        }
        await this.invalidateBookingCache(bookingId);
        return {
            rescheduled: true,
            requiresCoordinatorChange: false,
            bookingId: booking._id,
            bookingReference: booking.bookingReference,
            previousScheduledAt,
            scheduledAt: booking.scheduledAt,
            bookingStatus: booking.status,
            coordinatorId: booking.assignment?.assignedCoordinatorId ?? null,
            rescheduledAt: now,
            message: coordinatorId ? "Booking rescheduled successfully. Existing coordinator remains assigned for the selected date." : "Booking rescheduled successfully.",
        };
    }
    static async updateBookingStatus(bookingId, status, userId, role, reason) {
        const booking = await Booking.findOne({ _id: bookingId, isDeleted: false });
        if (!booking) {
            throw new Error("Booking not found");
        }
        const allowedTransitions = STATUS_TRANSITIONS[booking.status];
        if (!allowedTransitions.includes(status)) {
            throw new Error(`Cannot change booking from ${booking.status} to ${status}`);
        }
        if (["CONFIRMED", "ASSIGNMENT_PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(status) && booking.payment.status !== "PAID") {
            throw new Error("Booking payment must be PAID before progressing");
        }
        const now = new Date();
        const previousStatus = booking.status;
        const ensureAssignment = () => {
            if (!booking.assignment) {
                booking.assignment = { status: "NOT_STARTED", currentRound: 1, requests: [] };
            }
            booking.assignment.requests ??= [];
            return booking.assignment;
        };
        switch (status) {
            case "PENDING_PAYMENT": {
                booking.status = "PENDING_PAYMENT";
                booking.payment.status = "PENDING";
                const assignment = ensureAssignment();
                assignment.status = "NOT_STARTED";
                break;
            }
            case "CONFIRMED": {
                booking.status = "CONFIRMED";
                const assignment = ensureAssignment();
                assignment.status = "PENDING_SELECTION";
                break;
            }
            case "ASSIGNMENT_PENDING": {
                booking.status = "ASSIGNMENT_PENDING";
                const assignment = ensureAssignment();
                assignment.status = assignment.assignedCoordinatorId ? "PENDING_RESPONSE" : "PENDING_SELECTION";
                break;
            }
            case "ASSIGNED": {
                const assignment = ensureAssignment();
                if (!assignment.assignedCoordinatorId) {
                    throw new Error("Coordinator must be assigned before booking can be marked as ASSIGNED");
                }
                booking.status = "ASSIGNED";
                assignment.status = "ACCEPTED";
                assignment.assignedAt ??= now;
                assignment.coordinatorAcceptedAt ??= now;
                break;
            }
            case "IN_PROGRESS": {
                const assignment = ensureAssignment();
                if (assignment.status !== "ACCEPTED" || !assignment.assignedCoordinatorId) {
                    throw new Error("Booking must have an accepted coordinator before starting");
                }
                booking.status = "IN_PROGRESS";
                if (!booking.execution) {
                    booking.execution = {
                        stage: "SERVICE_EXECUTION",
                        startedAt: now,
                        serviceExecutions: [],
                        milestones: [],
                        progressPercentage: 0,
                    };
                }
                else {
                    booking.execution.stage = "SERVICE_EXECUTION";
                    booking.execution.startedAt ??= now;
                }
                break;
            }
            case "COMPLETED": {
                const serviceExecutions = booking.execution?.serviceExecutions ?? [];
                const allServicesCompleted = serviceExecutions.length > 0 && serviceExecutions.every((service) => service.status === "COMPLETED" || service.status === "SKIPPED" || service.status === "CANCELLED");
                if (!allServicesCompleted) {
                    throw new Error("All booking services must be resolved before completion");
                }
                booking.status = "COMPLETED";
                booking.completedAt = now;
                if (!booking.execution) {
                    booking.execution = {
                        stage: "FINISHED",
                        startedAt: now,
                        finishedAt: now,
                        serviceExecutions,
                        milestones: [],
                        progressPercentage: 100,
                    };
                }
                else {
                    booking.execution.stage = "FINISHED";
                    booking.execution.startedAt ??= now;
                    booking.execution.finishedAt = now;
                    booking.execution.progressPercentage = 100;
                }
                break;
            }
            case "CANCELLED": {
                if (!reason?.trim()) {
                    throw new Error("Cancellation reason required");
                }
                booking.status = "CANCELLED";
                booking.cancellation = {
                    reason: reason.trim(),
                    cancelledAt: now,
                    cancelledBy: new Types.ObjectId(userId),
                    cancelledByRole: role,
                    refundPercentage: booking.cancellation?.refundPercentage ?? 0,
                    refundAmount: booking.cancellation?.refundAmount ?? 0,
                };
                break;
            }
            case "EXPIRED": {
                booking.status = "EXPIRED";
                booking.payment.status = "FAILED";
                booking.payment.failureReason = "Payment expired";
                break;
            }
        }
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                await booking.save({ session });
                if (booking.userId) {
                    if (status === "CONFIRMED") {
                        await OutboxService.createEvent({
                            eventId: `BOOKING.CONFIRMED:${booking._id.toString()}`,
                            eventType: DOMAIN_EVENTS.BOOKING_CONFIRMED,
                            aggregateType: "BOOKING",
                            aggregateId: booking._id.toString(),
                            payload: {
                                bookingId: booking._id.toString(),
                                bookingReference: booking.bookingReference,
                                userId: booking.userId.toString(),
                                scheduledAt: booking.scheduledAt ?? null,
                            },
                            session,
                        });
                    }
                    if (status === "CANCELLED") {
                        await OutboxService.createEvent({
                            eventId: `BOOKING.CANCELLED:${booking._id.toString()}`,
                            eventType: DOMAIN_EVENTS.BOOKING_CANCELLED,
                            aggregateType: "BOOKING",
                            aggregateId: booking._id.toString(),
                            payload: {
                                bookingId: booking._id.toString(),
                                bookingReference: booking.bookingReference,
                                userId: booking.userId.toString(),
                                coordinatorId: booking.assignment?.assignedCoordinatorId?.toString() ?? null,
                                reason: booking.cancellation?.reason ?? reason ?? "Booking cancelled",
                            },
                            session,
                        });
                    }
                    if (status === "IN_PROGRESS") {
                        await OutboxService.createEvent({
                            eventId: `BOOKING.STARTED:${booking._id.toString()}`,
                            eventType: DOMAIN_EVENTS.BOOKING_STARTED,
                            aggregateType: "BOOKING",
                            aggregateId: booking._id.toString(),
                            payload: {
                                bookingId: booking._id.toString(),
                                bookingReference: booking.bookingReference,
                                userId: booking.userId.toString(),
                                coordinatorId: booking.assignment?.assignedCoordinatorId?.toString() ?? null,
                                startedAt: booking.execution?.startedAt ?? now,
                            },
                            session,
                        });
                    }
                    if (status === "COMPLETED") {
                        await OutboxService.createEvent({
                            eventId: `BOOKING.COMPLETED:${booking._id.toString()}`,
                            eventType: DOMAIN_EVENTS.BOOKING_COMPLETED,
                            aggregateType: "BOOKING",
                            aggregateId: booking._id.toString(),
                            payload: {
                                bookingId: booking._id.toString(),
                                bookingReference: booking.bookingReference,
                                userId: booking.userId.toString(),
                                completedAt: booking.completedAt ?? now,
                            },
                            session,
                        });
                    }
                }
            });
        }
        finally {
            await session.endSession();
        }
        return {
            bookingId: booking._id,
            bookingReference: booking.bookingReference,
            previousStatus,
            currentStatus: booking.status,
            paymentStatus: booking.payment.status,
            assignmentStatus: booking.assignment?.status,
            executionStage: booking.execution?.stage,
        };
    }
    static async refundBooking(bookingId, amount, reason, refundedBy) {
        if (!Types.ObjectId.isValid(bookingId)) {
            throw new Error("Invalid booking ID");
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("Refund amount must be greater than zero");
        }
        const normalizedReason = reason?.trim();
        if (!normalizedReason) {
            throw new Error("Refund reason is required");
        }
        // Use a collision-resistant ID instead of Date.now().
        const refundReference = `REF-${crypto.randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`;
        // STEP 1 Atomically reserve refundable balance. Two requests cannot both reserve the same money.
        const reservedBooking = await Booking.findOneAndUpdate({
            _id: bookingId,
            isDeleted: false,
            "payment.status": { $in: ["PAID", "PARTIAL_REFUND"] },
            "payment.providerPaymentId": { $exists: true, $ne: null },
            "payment.providerOrderId": { $exists: true, $ne: null },
            // refundAmount + currently reserved + requested amount must remain <= grandTotal.
            $expr: {
                $lte: [{ $add: [{ $ifNull: ["$payment.refundAmount", 0] }, { $ifNull: ["$payment.refundReservedAmount", 0] }, amount] }, "$pricing.grandTotal"],
            },
        }, {
            $inc: { "payment.refundReservedAmount": amount },
        }, { new: true, runValidators: true });
        if (!reservedBooking) {
            // Fetch only to give a useful error.
            const current = await Booking.findOne({ _id: bookingId, isDeleted: false }).select("payment pricing.grandTotal").lean();
            if (!current) {
                throw new Error("Booking not found");
            }
            if (current.payment.status !== "PAID" && current.payment.status !== "PARTIAL_REFUND") {
                throw new Error("Only paid bookings can be refunded");
            }
            if (!current.payment.providerPaymentId) {
                throw new Error("Payment transaction not found");
            }
            const refunded = current.payment.refundAmount ?? 0;
            const reserved = current.payment.refundReservedAmount ?? 0;
            const available = Math.max(0, current.pricing.grandTotal - refunded - reserved);
            throw new Error(`Maximum currently refundable amount is ₹${available}`);
        }
        const orderId = reservedBooking.payment.providerOrderId;
        let refundResponse;
        // STEP 2 Call provider only AFTER local reservation.
        try {
            refundResponse = await CashfreeService.refundPayment({ orderId, amount, refundId: refundReference, reason: normalizedReason });
        }
        catch (error) {
            // Provider rejected/failed before acceptingrefund. Release our reservation.
            await Booking.updateOne({ _id: bookingId, "payment.refundReservedAmount": { $gte: amount } }, { $inc: { "payment.refundReservedAmount": -amount } });
            throw error;
        }
        const providerStatus = String(refundResponse?.refund_status ?? "PENDING").toUpperCase();
        // Cashfree may return refund states that are still being processed. Once Cashfree accepted the refund request, don't make that money refundable again.
        const providerAccepted = ["SUCCESS", "PENDING", "INITIALIZED"].includes(providerStatus);
        if (!providerAccepted) {
            await Booking.updateOne({ _id: bookingId, "payment.refundReservedAmount": { $gte: amount } }, { $inc: { "payment.refundReservedAmount": -amount } });
            throw new Error(`Refund was not accepted by Cashfree. Status: ${providerStatus}`);
        }
        // STEP 3 Convert reservation into committed refund.
        const session = await mongoose.startSession();
        let finalTotalRefunded = 0;
        let finalPaymentStatus = "PARTIAL_REFUND";
        try {
            await session.withTransaction(async () => {
                const booking = await Booking.findOne({ _id: bookingId, isDeleted: false }).session(session);
                if (!booking) {
                    throw new Error("Booking not found");
                }
                const reserved = booking.payment.refundReservedAmount ?? 0;
                // If this fails, DO NOT release the reservation automatically outside the transaction because Cashfree already accepted the refund.
                if (reserved < amount) {
                    throw new Error("Refund reservation is missing");
                }
                const alreadyRefunded = booking.payment.refundAmount ?? 0;
                finalTotalRefunded = alreadyRefunded + amount;
                booking.payment.refundReservedAmount = Math.max(0, reserved - amount);
                booking.payment.refundAmount = finalTotalRefunded;
                booking.payment.refundedAt = new Date();
                booking.payment.refunds = booking.payment.refunds ?? [];
                booking.payment.refunds.push({
                    refundId: refundReference,
                    amount,
                    reason: normalizedReason,
                    refundedAt: new Date(),
                    providerRefundId: refundResponse?.cf_refund_id ?? refundResponse?.refund_id,
                    status: providerStatus === "SUCCESS" ? "SUCCESS" : "PENDING",
                    ...(refundedBy && Types.ObjectId.isValid(refundedBy) ? { refundedBy: new Types.ObjectId(refundedBy) } : {}),
                });
                if (finalTotalRefunded >= booking.pricing.grandTotal) {
                    booking.payment.status = "REFUNDED";
                    finalPaymentStatus = "REFUNDED";
                }
                else {
                    booking.payment.status = "PARTIAL_REFUND";
                    finalPaymentStatus = "PARTIAL_REFUND";
                }
                await booking.save({ session });
                // Only SUCCESS is announced as completed refund. PENDING/INITIALIZED should wait until your refund-status synchronization confirms success.
                if (booking.userId && providerStatus === "SUCCESS") {
                    await OutboxService
                        .createEvent({
                        eventId: `PAYMENT.REFUNDED:${booking._id.toString()}:${refundReference}`,
                        eventType: DOMAIN_EVENTS.PAYMENT_REFUNDED,
                        aggregateType: "BOOKING",
                        aggregateId: booking._id.toString(),
                        payload: {
                            bookingId: booking._id.toString(),
                            bookingReference: booking.bookingReference,
                            userId: booking.userId.toString(),
                            refundedAmount: amount,
                            totalRefunded: finalTotalRefunded,
                            paymentStatus: finalPaymentStatus,
                            reason: normalizedReason,
                        },
                        session,
                    });
                }
            });
        }
        finally {
            await session.endSession();
        }
        await this.invalidateBookingCache(bookingId);
        return {
            bookingId: reservedBooking._id,
            bookingReference: reservedBooking.bookingReference,
            paymentStatus: finalPaymentStatus,
            refundedAmount: amount,
            totalRefunded: finalTotalRefunded,
            remainingAmount: Math.max(0, reservedBooking.pricing.grandTotal - finalTotalRefunded),
            refundId: refundReference,
            providerRefundStatus: providerStatus,
        };
    }
    static async expirePendingPayments() {
        const now = new Date();
        const session = await mongoose.startSession();
        try {
            let result = { expiredBookings: 0, releasedCarts: 0 };
            await session.withTransaction(async () => {
                const expiredBookings = await Booking.find({
                    status: "PENDING_PAYMENT",
                    "payment.status": { $in: ["PENDING", "PROCESSING"] },
                    paymentExpiresAt: { $lte: now },
                }, { _id: 1, cartId: 1, userId: 1, bookingReference: 1 }).session(session);
                if (!expiredBookings.length) {
                    return;
                }
                const bookingIds = expiredBookings.map((booking) => booking._id);
                const cartIds = expiredBookings.map((booking) => booking.cartId).filter(Boolean);
                await Cart.updateMany({
                    _id: { $in: cartIds },
                    status: { $in: ["CHECKED_OUT", "CHECKOUT_PENDING"] },
                }, {
                    $unset: { activeBookingId: 1 },
                    $set: { status: "ACTIVE" },
                }, { session });
                const bookingUpdateResult = await Booking.updateMany({ _id: { $in: bookingIds } }, {
                    $set: {
                        status: "EXPIRED",
                        "payment.status": "FAILED",
                        "payment.failureReason": "Payment expired",
                    },
                    $unset: { paymentExpiresAt: 1 },
                }, { session });
                for (const expiredBooking of expiredBookings) {
                    if (!expiredBooking.userId) {
                        continue;
                    }
                    await OutboxService.createEvent({
                        eventId: `PAYMENT.FAILED:${expiredBooking._id.toString()}:EXPIRED`,
                        eventType: DOMAIN_EVENTS.PAYMENT_FAILED,
                        aggregateType: "BOOKING",
                        aggregateId: expiredBooking._id.toString(),
                        payload: {
                            bookingId: expiredBooking._id.toString(),
                            bookingReference: expiredBooking.bookingReference,
                            userId: expiredBooking.userId.toString(),
                            reason: "Payment window expired",
                        },
                        session,
                    });
                }
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
    static async cancelBooking(bookingId, userId, role, reason) {
        const booking = await Booking.findOne({ _id: bookingId, isDeleted: false });
        if (!booking) {
            throw new Error("Booking not found");
        }
        const isOwner = booking.userId?.toString() === userId;
        const isAssignedCoordinator = booking.assignment?.assignedCoordinatorId?.toString() === userId;
        if (role === Role.USER) {
            if (!isOwner) {
                throw new Error("You are not authorized to cancel this booking");
            }
        }
        else if (role === Role.COORDINATOR) {
            if (!isAssignedCoordinator) {
                throw new Error("You are not authorized to cancel this booking");
            }
        }
        else if (role === Role.ADMIN) {
            // No ownership/assignment restriction.
        }
        else {
            throw new Error("You are not authorized to cancel this booking");
        }
        await this.invalidateBookingCache(bookingId);
        return this.updateBookingStatus(bookingId, "CANCELLED", userId, role, reason);
    }
    static async getMyBookingById(bookingId, userId, role) {
        if (!Types.ObjectId.isValid(bookingId)) {
            throw new Error("Invalid booking ID");
        }
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }
        const bookingObjectId = new Types.ObjectId(bookingId);
        const userObjectId = new Types.ObjectId(userId);
        // Build access condition according to authenticated role.
        const query = { _id: bookingObjectId, isDeleted: false };
        // USER can view: 1. Their own booking 2. Booking where they are beneficiary
        if (role === Role.USER) {
            query.$or = [{ userId: userObjectId }, { beneficiaryUserId: userObjectId }];
        }
        // COORDINATOR can view: 1. Booking currently assigned to them 2. Booking where they currently have    a pending assignment request
        else if (role === Role.COORDINATOR) {
            query.$or = [
                { "assignment.assignedCoordinatorId": userObjectId },
                { "assignment.requests": { $elemMatch: { coordinatorId: userObjectId, status: "PENDING" } } },
            ];
        }
        else {
            throw new Error("You are not authorized to view this booking");
        }
        const booking = await Booking.findOne(query).populate({
            path: "assignment.assignedCoordinatorId",
            select: {
                fullName: 1,
                profileImage: 1,
                gender: 1,
                caste: 1,
                gotra: 1,
                userReference: 1,
                "coordinatorProfile.averageRating": 1,
                "coordinatorProfile.totalRatings": 1,
                "coordinatorProfile.totalCompletedBookings": 1,
                "coordinatorProfile.availabilityStatus": 1,
            },
        }).populate({
            path: "assignment.requests.coordinatorId",
            select: {
                fullName: 1,
                profileImage: 1,
                gender: 1,
                caste: 1,
                gotra: 1,
                userReference: 1,
                "coordinatorProfile.averageRating": 1,
                "coordinatorProfile.totalRatings": 1,
                "coordinatorProfile.totalCompletedBookings": 1,
                "coordinatorProfile.availabilityStatus": 1,
            },
        }).lean();
        if (!booking) {
            throw new Error("Booking not found");
        }
        // Current assigned coordinator.
        const assignedCoordinator = booking.assignment?.assignedCoordinatorId;
        const coordinator = assignedCoordinator && typeof assignedCoordinator === "object"
            ? {
                coordinatorId: assignedCoordinator._id,
                fullName: assignedCoordinator.fullName,
                profileImage: assignedCoordinator.profileImage,
                gender: assignedCoordinator.gender,
                userReference: assignedCoordinator.userReference,
                caste: assignedCoordinator.caste,
                gotra: assignedCoordinator.gotra,
                rating: {
                    averageRating: assignedCoordinator.coordinatorProfile?.averageRating ?? 0,
                    totalRatings: assignedCoordinator.coordinatorProfile?.totalRatings ?? 0,
                },
                experience: { totalCompletedBookings: assignedCoordinator.coordinatorProfile?.totalCompletedBookings ?? 0 },
                availabilityStatus: assignedCoordinator.coordinatorProfile?.availabilityStatus,
            }
            : null;
        // USER: Can see all assignment requests. COORDINATOR: Can only see their own request. This prevents coordinator A from seeing coordinator B/C details.
        const assignmentRequests = booking.assignment?.requests ?? [];
        const visibleRequests = role === Role.COORDINATOR ?
            assignmentRequests.filter((request) => {
                const populatedCoordinator = request.coordinatorId;
                const requestCoordinatorId = populatedCoordinator && typeof populatedCoordinator === "object" ? populatedCoordinator._id?.toString() : populatedCoordinator?.toString();
                return (requestCoordinatorId === userId);
            }) : assignmentRequests;
        // Format visible coordinator requests.
        const coordinatorRequests = visibleRequests.map((request) => {
            const requestedCoordinator = request.coordinatorId;
            return {
                requestId: request._id,
                status: request.status,
                assignmentType: request.assignmentType,
                requestedAt: request.requestedAt,
                responseDeadlineAt: request.responseDeadlineAt,
                respondedAt: request.respondedAt,
                rejectionReason: request.rejectionReason,
                coordinator: requestedCoordinator && typeof requestedCoordinator === "object"
                    ? {
                        coordinatorId: requestedCoordinator._id,
                        fullName: requestedCoordinator.fullName,
                        profileImage: requestedCoordinator.profileImage,
                        gender: requestedCoordinator.gender,
                        userReference: requestedCoordinator.userReference,
                        caste: requestedCoordinator.caste,
                        gotra: requestedCoordinator.gotra,
                        rating: {
                            averageRating: requestedCoordinator.coordinatorProfile?.averageRating ?? 0,
                            totalRatings: requestedCoordinator.coordinatorProfile?.totalRatings ?? 0,
                        },
                        experience: { totalCompletedBookings: requestedCoordinator.coordinatorProfile?.totalCompletedBookings ?? 0 },
                        availabilityStatus: requestedCoordinator.coordinatorProfile?.availabilityStatus,
                    }
                    : null,
            };
        });
        const { assignment, ...bookingData } = booking;
        return {
            ...bookingData,
            notes: booking.notes ?? null,
            assignment: assignment
                ? {
                    ...assignment,
                    // Return clean coordinator ID rather than populated object in this property.
                    assignedCoordinatorId: assignedCoordinator?._id ?? assignedCoordinator ?? null,
                    requests: coordinatorRequests,
                }
                : null,
            // Full formatted currently assigned coordinator information.
            coordinator,
        };
    }
    static async getMyBookings(params) {
        return this.findBookings({
            accessibleByUserId: params.userId,
            ...(params.status && { status: params.status }),
            ...(params.page && { page: params.page }),
            ...(params.limit && { limit: params.limit }),
            ...(params.sortBy && { sortBy: params.sortBy }),
            ...(params.sortOrder && { sortOrder: params.sortOrder }),
            includeCoordinatorProfile: true,
        });
    }
    static async getBookingCategory(status) {
        switch (status) {
            case "PENDING_PAYMENT": return "PAYMENT_PENDING";
            case "EXPIRED": return "EXPIRED";
            case "IN_PROGRESS": return "ONGOING";
            case "COMPLETED": return "COMPLETED";
            case "CANCELLED": return "CANCELLED";
            default: return "UPCOMING";
        }
    }
    static async getAvailableCoordinators(bookingId, userId, options = {}) {
        // 1. FETCH + VALIDATE BOOKING
        const booking = await Booking.findOne({ _id: bookingId, isDeleted: false });
        if (!booking) {
            throw new Error("Booking not found");
        }
        if (booking.payment.status !== "PAID") {
            throw new Error("Payment must be completed before selecting a coordinator");
        }
        if (!["CONFIRMED", "ASSIGNMENT_PENDING", "ASSIGNED"].includes(booking.status)) {
            throw new Error("Coordinator selection is not available for this booking");
        }
        const isOwner = booking.userId?.toString() === userId;
        const assignment = booking.assignment;
        const activeReassignment = assignment?.reassignment;
        const currentRound = assignment?.currentRound ?? 1;
        // Active manual-selection phase of AUTO reassignment. requestReassignment() always creates USER/COORDINATOR reassignment with mode AUTO. The currently assigned coordinator stays assigned until one replacement coordinator accepts.
        const isActiveReassignment = booking.status === "ASSIGNED" && assignment?.status === "ACCEPTED" && !!assignment.assignedCoordinatorId && !!activeReassignment && activeReassignment.mode === "AUTO" && activeReassignment.assignmentRound === currentRound && (activeReassignment.requestedByRole === "USER" || activeReassignment.requestedByRole === "COORDINATOR") && (activeReassignment.status === "PENDING_REPLACEMENT" || activeReassignment.status === "REPLACEMENT_REQUESTED");
        // Coordinator access is allowed only to the coordinator who actually initiated this active reassignment. Also make sure that coordinator is still the currently assigned coordinator. requestReassignment() guarantees this when the reassignment is created.
        const isRequestingCoordinator = isActiveReassignment && activeReassignment.requestedByRole === "COORDINATOR" && activeReassignment.requestedBy.toString() === userId && assignment.assignedCoordinatorId?.toString() === userId;
        // Booking owner may use: - initial coordinator selection - reschedule selection - USER reassignment selection Assigned coordinator may use: - only the reassignment they initiated.
        if (!isOwner && !isRequestingCoordinator) {
            throw new Error("You are not authorized to view available coordinators for this booking");
        }
        // Never mix rescheduling and reassignment.
        if (isActiveReassignment && options.scheduledAt) {
            throw new Error("Booking cannot be rescheduled while reassignment is in progress");
        }
        // ASSIGNED booking normally cannot expose coordinator selection. Exceptions: 1. User is checking coordinators for a new reschedule date. 2. Active USER/COORDINATOR reassignment is in progress.
        if (booking.status === "ASSIGNED" && !options.scheduledAt && !isActiveReassignment) {
            throw new Error("Coordinator cannot be changed directly for an assigned booking");
        }
        // 2. LOAD ADMIN CONFIGURATION Coordinator matching/ranking rules are controlled by admin configuration. The user cannot override these values through query params.
        const coordinatorConfig = await CoordinatorSelectionConfigService.getEffectiveConfig();
        // 3. RESOLVE BOOKING SERVICE LOCATIONS
        const locationIds = this.getBookingLocationIds(booking);
        if (locationIds.length === 0) {
            throw new Error("No service location found in booking");
        }
        // 4. DETERMINE TARGET SCHEDULE DATE During normal coordinator selection:     booking.scheduledAt During reschedule coordinator selection:     options.scheduledAt
        let targetScheduledAt = booking.scheduledAt;
        if (options.scheduledAt) {
            const requestedDate = new Date(options.scheduledAt);
            if (Number.isNaN(requestedDate.getTime())) {
                throw new Error("Invalid scheduled date");
            }
            if (requestedDate <= new Date()) {
                throw new Error("Scheduled date must be in the future");
            }
            targetScheduledAt = requestedDate;
        }
        // 5. FIND COORDINATORS ALREADY REQUESTED This is date-aware. Coordinators already requested for this same target date should not appear again. A coordinator rejected/expired for another scheduled date can become eligible again after rescheduling.
        const requestedCoordinatorIds = this.getRequestedCoordinatorIds(booking, targetScheduledAt);
        const currentRoundRequests = (booking.assignment?.requests ?? []).filter((request) => (request.assignmentRound ?? 1) === currentRound);
        const manualRequestCount = currentRoundRequests.filter((request) => request.assignmentType === "MANUAL").length;
        const automaticFallbackStarted = currentRoundRequests.some((request) => request.assignmentType === "AUTO");
        const maxManualRequests = isActiveReassignment ? this.getReassignmentManualRequestLimit(activeReassignment.requestedByRole) : options.scheduledAt ? MAX_RESCHEDULE_USER_REQUESTS : null;
        const manualLimitReached = maxManualRequests !== null && manualRequestCount >= maxManualRequests;
        const excludedCoordinatorIds = new Map();
        for (const id of requestedCoordinatorIds) {
            excludedCoordinatorIds.set(id.toString(), id);
        }
        // During USER reassignment, the currently assigned coordinator is the fallback owner and must not be offered as replacement.
        if (isActiveReassignment && booking.assignment?.assignedCoordinatorId) {
            const assignedId = new Types.ObjectId(booking.assignment.assignedCoordinatorId.toString());
            excludedCoordinatorIds.set(assignedId.toString(), assignedId);
        }
        // 6. BUILD BASE COORDINATOR QUERY
        const query = {
            role: "COORDINATOR",
            isActive: true,
            isDocumentVerified: true,
            "coordinatorProfile.approvalStatus": "APPROVED",
            "coordinatorProfile.availabilityStatus": "AVAILABLE",
        };
        // Date-specific coordinator availability
        if (targetScheduledAt) {
            query["coordinatorProfile.unavailableDates"] = this.buildCoordinatorUnavailableDateFilter(targetScheduledAt);
        }
        const normalizedSearchTerm = options.searchTerm?.trim();
        if (normalizedSearchTerm) {
            const escapedSearchTerm = normalizedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const searchRegex = new RegExp(escapedSearchTerm, "i");
            query.$or = [{ fullName: searchRegex }];
        }
        // 7. BUILD SERVICEABLE LOCATION MATCH
        const serviceableLocationMatch = { locationId: { $in: locationIds } };
        // 8. APPLY ADMIN CASTE MATCHING RULE
        if (coordinatorConfig.matchCaste) {
            const bookingCaste = booking.customerDetails?.caste?.trim();
            if (!bookingCaste) {
                throw new Error("Caste matching is enabled, but booking caste is missing");
            }
            serviceableLocationMatch.caste = bookingCaste;
        }
        // 9. APPLY ADMIN GOTRA MATCHING RULE
        if (coordinatorConfig.matchGotra) {
            const bookingGotra = booking.customerDetails?.gotra?.trim();
            if (!bookingGotra) {
                throw new Error("Gotra matching is enabled, but booking gotra is missing");
            }
            serviceableLocationMatch.gotra = bookingGotra;
        }
        // Caste/gotra must belong to the SAME serviceable location entry as the matching booking location. $elemMatch is therefore important here.
        query["coordinatorProfile.serviceableLocations"] = { $elemMatch: serviceableLocationMatch };
        // 10. EXCLUDE ALREADY REQUESTED COORDINATORS
        if (manualLimitReached || (isActiveReassignment && automaticFallbackStarted)) {
            // No more manual coordinator selections should be offered.
            query._id = { $in: [] };
        }
        else if (excludedCoordinatorIds.size > 0) {
            query._id = { $nin: Array.from(excludedCoordinatorIds.values()) };
        }
        // 11. APPLY ADMIN MINIMUM RATING
        if (coordinatorConfig.minRating > 0) {
            query["coordinatorProfile.averageRating"] = { $gte: coordinatorConfig.minRating };
        }
        // 12. APPLY ADMIN MINIMUM COMPLETED BOOKINGS
        if (coordinatorConfig.minCompletedBookings > 0) {
            query["coordinatorProfile.totalCompletedBookings"] = { $gte: coordinatorConfig.minCompletedBookings };
        }
        // 13. APPLY AUTO ASSIGNMENT CONFIGURATION true   -> only coordinators with auto assignment enabled false   -> only coordinators with auto assignment disabled null   -> don't filter by auto assignment preference
        if (coordinatorConfig.autoAssignmentEnabled !== null) {
            query["coordinatorProfile.autoAssignmentEnabled"] = coordinatorConfig.autoAssignmentEnabled;
        }
        // 14. BUILD ADMIN-CONTROLLED SORT
        const sortDirection = coordinatorConfig.sortOrder === "asc" ? 1 : -1;
        const sort = {};
        switch (coordinatorConfig.sortBy) {
            case "completedBookings":
                sort["coordinatorProfile.totalCompletedBookings"] = sortDirection;
                // Stable secondary sorting.
                sort["coordinatorProfile.averageRating"] = -1;
                break;
            case "acceptanceRate":
                sort["coordinatorProfile.acceptanceRate"] = sortDirection;
                sort["coordinatorProfile.averageRating"] = -1;
                break;
            case "rating":
            default:
                sort["coordinatorProfile.averageRating"] = sortDirection;
                sort["coordinatorProfile.totalCompletedBookings"] = -1;
                break;
        }
        // 15. FETCH POSSIBLE COORDINATORS maxDailyBookings is selected because it is needed internally for the daily capacity check below.
        const coordinators = await User.find(query).select({
            fullName: 1,
            profileImage: 1,
            gender: 1,
            caste: 1,
            gotra: 1,
            userReference: 1,
            "coordinatorProfile.averageRating": 1,
            "coordinatorProfile.totalRatings": 1,
            "coordinatorProfile.totalCompletedBookings": 1,
            "coordinatorProfile.acceptanceRate": 1,
            "coordinatorProfile.availabilityStatus": 1,
            "coordinatorProfile.maxDailyBookings": 1,
        }).sort(sort).lean();
        // 16. CHECK DAILY BOOKING CAPACITY
        let availableCoordinators = coordinators;
        if (targetScheduledAt && coordinators.length > 0) {
            const startOfDay = new Date(targetScheduledAt);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(targetScheduledAt);
            endOfDay.setHours(23, 59, 59, 999);
            // Fetch all assigned/in-progress bookings for these coordinators in one aggregation instead of performing one countDocuments() query per coordinator. This avoids the N+1 query problem.
            const coordinatorIds = coordinators.map((coordinator) => coordinator._id);
            const bookingCounts = await Booking.aggregate([
                {
                    $match: {
                        _id: { $ne: booking._id },
                        isDeleted: false,
                        "assignment.assignedCoordinatorId": { $in: coordinatorIds },
                        scheduledAt: { $gte: startOfDay, $lte: endOfDay },
                        status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
                    },
                },
                {
                    $group: { _id: "$assignment.assignedCoordinatorId", count: { $sum: 1 } },
                },
            ]);
            // Convert aggregation result into: coordinatorId -> assigned booking count
            const bookingCountMap = new Map();
            for (const item of bookingCounts) {
                bookingCountMap.set(item._id.toString(), item.count);
            }
            // Remove coordinators who have reached their maximum daily booking capacity.
            availableCoordinators = coordinators.filter((coordinator) => {
                const coordinatorId = coordinator._id.toString();
                const assignedBookings = bookingCountMap.get(coordinatorId) ?? 0;
                const maxDailyBookings = coordinator.coordinatorProfile?.maxDailyBookings ?? 5;
                return (assignedBookings < maxDailyBookings);
            });
        }
        // 17. BUILD SAFE RESPONSE DTO Internal fields such as maxDailyBookings are not exposed unless the frontend actually requires them.
        const coordinatorList = availableCoordinators.map((coordinator) => ({
            coordinatorId: coordinator._id,
            fullName: coordinator.fullName,
            profileImage: coordinator.profileImage,
            gender: coordinator.gender,
            userReference: coordinator.userReference,
            caste: coordinator.caste,
            gotra: coordinator.gotra,
            rating: {
                averageRating: coordinator.coordinatorProfile?.averageRating ?? 0,
                totalRatings: coordinator.coordinatorProfile?.totalRatings ?? 0,
            },
            experience: { totalCompletedBookings: coordinator.coordinatorProfile?.totalCompletedBookings ?? 0 },
            availabilityStatus: coordinator.coordinatorProfile?.availabilityStatus,
        }));
        // 18. RETURN RESULT
        return {
            bookingId: booking._id,
            bookingLocationIds: locationIds,
            // Date for which this coordinator list was calculated.
            scheduledAt: targetScheduledAt ?? null,
            // Indicates whether the caller supplied another date while selecting coordinator for rescheduling.
            isRescheduleSelection: Boolean(options.scheduledAt),
            // Booking/customer preferences.
            bookingPreferences: {
                caste: booking.customerDetails?.caste,
                gotra: booking.customerDetails?.gotra,
            },
            // These values came from ADMIN configuration, not from user query parameters.
            selectionConfiguration: {
                matchCaste: coordinatorConfig.matchCaste,
                matchGotra: coordinatorConfig.matchGotra,
                minRating: coordinatorConfig.minRating,
                minCompletedBookings: coordinatorConfig.minCompletedBookings,
                autoAssignmentEnabled: coordinatorConfig.autoAssignmentEnabled,
                sortBy: coordinatorConfig.sortBy,
                sortOrder: coordinatorConfig.sortOrder,
            },
            // Request-specific information stays separate from admin configuration.
            requestContext: {
                scheduledAt: options.scheduledAt ?? null,
                isReassignmentSelection: isActiveReassignment,
                reassignmentRequestedByRole: isActiveReassignment ? activeReassignment?.requestedByRole : null,
                maxCoordinatorRequests: maxManualRequests,
                sentCoordinatorRequests: maxManualRequests !== null ? manualRequestCount : null,
                remainingCoordinatorRequests: maxManualRequests !== null ? Math.max(maxManualRequests - manualRequestCount, 0) : null,
                automaticFallbackStarted,
            },
            assignmentStatus: booking.assignment?.status,
            assignmentExpiresAt: booking.assignment?.assignmentExpiresAt,
            total: coordinatorList.length,
            coordinators: coordinatorList,
        };
    }
    static async selectCoordinator(params) {
        const { bookingId, coordinatorId, selectedBy, assignmentType, scheduledAt, rescheduleReason } = params;
        const booking = await Booking.findOne({ _id: bookingId, isDeleted: false });
        if (!booking) {
            throw new Error("Booking not found");
        }
        if (booking.payment.status !== "PAID") {
            throw new Error("Booking payment must be paid before coordinator selection");
        }
        if (!["CONFIRMED", "ASSIGNMENT_PENDING", "ASSIGNED"].includes(booking.status)) {
            throw new Error(`Cannot select coordinator for ${booking.status} booking`);
        }
        // Normal coordinator selection has a customer selection window. Reschedule selection is intentionally not restricted by the original assignmentExpiresAt.
        if (!scheduledAt && booking.assignment?.assignmentExpiresAt && booking.assignment.assignmentExpiresAt <= new Date()) {
            throw new Error("Coordinator assignment window has expired");
        }
        const activeReassignment = booking.assignment?.reassignment;
        const isActiveReassignment = booking.status === "ASSIGNED" && activeReassignment?.mode === "AUTO" && ["USER", "COORDINATOR"].includes(activeReassignment.requestedByRole) && ["PENDING_REPLACEMENT", "REPLACEMENT_REQUESTED"].includes(activeReassignment.status);
        const isOwner = booking.userId?.toString() === selectedBy;
        const isRequestingCoordinator = isActiveReassignment && activeReassignment?.requestedByRole === "COORDINATOR" && activeReassignment.requestedBy?.toString() === selectedBy;
        if (!isOwner && !isRequestingCoordinator) {
            throw new Error("Only the booking owner or the coordinator who requested reassignment can select a coordinator");
        }
        if (activeReassignment && ["PENDING_REPLACEMENT", "REPLACEMENT_REQUESTED"].includes(activeReassignment.status) && scheduledAt) {
            throw new Error("Booking cannot be rescheduled while reassignment is in progress");
        }
        const reassignmentRequestLimit = activeReassignment?.requestedByRole === "COORDINATOR" ? MAX_REASSIGNMENT_COORDINATOR_REQUESTS : MAX_REASSIGNMENT_USER_REQUESTS;
        if (booking.status === "ASSIGNED" && !scheduledAt && !isActiveReassignment) {
            throw new Error("Coordinator cannot be changed directly for an assigned booking");
        }
        if (isActiveReassignment && assignmentType !== "MANUAL") {
            throw new Error("Reassignment coordinator selection must be manual");
        }
        // DETERMINE TARGET SCHEDULE Normal assignment: booking.scheduledAt Reschedule: params.scheduledAt
        let targetScheduledAt = booking.scheduledAt;
        const isRescheduleSelection = Boolean(scheduledAt);
        if (scheduledAt) {
            const requestedSchedule = new Date(scheduledAt);
            if (Number.isNaN(requestedSchedule.getTime())) {
                throw new Error("Invalid scheduled date");
            }
            if (requestedSchedule <= new Date()) {
                throw new Error("Scheduled date must be in the future");
            }
            if (!rescheduleReason?.trim()) {
                throw new Error("Reschedule reason is required");
            }
            targetScheduledAt = requestedSchedule;
        }
        if (!targetScheduledAt) {
            throw new Error("Booking schedule is required before selecting a coordinator");
        }
        const currentRound = booking.assignment?.currentRound ?? 1;
        const currentRoundRequests = (booking.assignment?.requests ?? []).filter((request) => (request.assignmentRound ?? 1) === currentRound);
        if (isActiveReassignment) {
            const manualRequestCount = currentRoundRequests.filter((request) => request.assignmentType === "MANUAL").length;
            if (manualRequestCount >= reassignmentRequestLimit) {
                throw new Error(`You can send reassignment requests to a maximum of ${reassignmentRequestLimit} coordinators`);
            }
            const automaticFallbackStarted = currentRoundRequests.some((request) => request.assignmentType === "AUTO");
            if (automaticFallbackStarted) {
                throw new Error("Automatic replacement assignment has already started");
            }
        }
        if (isRescheduleSelection) {
            const pendingReschedule = booking.assignment?.pendingReschedule;
            const sameRescheduleRound = pendingReschedule && pendingReschedule.assignmentRound === currentRound && pendingReschedule.requestedScheduledAt?.getTime() === targetScheduledAt.getTime();
            if (sameRescheduleRound) {
                const manualRequestCount = currentRoundRequests.filter((request) => request.assignmentType === "MANUAL").length;
                if (manualRequestCount >= MAX_RESCHEDULE_USER_REQUESTS) {
                    throw new Error(`You can send reschedule requests to a maximum of ${MAX_RESCHEDULE_USER_REQUESTS} coordinators`);
                }
                const automaticFallbackStarted = currentRoundRequests.some((request) => request.assignmentType === "AUTO");
                if (automaticFallbackStarted) {
                    throw new Error("Automatic coordinator assignment has already started for this reschedule");
                }
            }
        }
        // CHECK IF COORDINATOR ALREADY RECEIVED THIS REQUEST getRequestedCoordinatorIds() is: - assignment-round aware - target-date aware Therefore an old coordinator from an earlier assignment round can become eligible again.
        const requestedCoordinatorIds = this.getRequestedCoordinatorIds(booking, targetScheduledAt);
        const alreadyRequested = requestedCoordinatorIds.some((id) => id.toString() === coordinatorId);
        if (alreadyRequested) {
            throw new Error("This coordinator has already received this booking request");
        }
        // REVALIDATE SELECTED COORDINATOR Never trust only the coordinator list returned earlier. Their availability may have changed between listing and selection.
        const locationIds = this.getBookingLocationIds(booking);
        const coordinator = await User.findOne({
            _id: coordinatorId,
            role: "COORDINATOR",
            isActive: true,
            isDocumentVerified: true,
            "coordinatorProfile.approvalStatus": "APPROVED",
            "coordinatorProfile.availabilityStatus": "AVAILABLE",
            "coordinatorProfile.unavailableDates": this.buildCoordinatorUnavailableDateFilter(targetScheduledAt),
            "coordinatorProfile.serviceableLocations.locationId": { $in: locationIds },
        });
        if (!coordinator) {
            throw new Error("Selected coordinator is not available for the selected booking date");
        }
        // CHECK CAPACITY ON TARGET DATE
        const startOfDay = new Date(targetScheduledAt);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetScheduledAt);
        endOfDay.setHours(23, 59, 59, 999);
        const bookedCount = await Booking.countDocuments({
            // Never count this booking itself.
            _id: { $ne: booking._id },
            isDeleted: false,
            "assignment.assignedCoordinatorId": coordinator._id,
            scheduledAt: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
        });
        const maxDailyBookings = coordinator.coordinatorProfile?.maxDailyBookings ?? 5;
        if (bookedCount >= maxDailyBookings) {
            throw new Error("Coordinator has reached the maximum booking limit for the selected date");
        }
        // USER REASSIGNMENT MANUAL REQUEST A remains assigned. B/C/D can all have PENDING requests (maximum 3). First acceptance wins.
        if (isActiveReassignment) {
            const updatedBooking = await this.assignReplacementCoordinatorRequest({ booking, coordinatorId, requestedBy: selectedBy, assignmentType: "MANUAL" });
            await this.invalidateBookingCache(bookingId);
            const sentCoordinatorRequests = (updatedBooking.assignment?.requests ?? []).filter((request) => (request.assignmentRound ?? 1) === (updatedBooking.assignment?.currentRound ?? 1) && request.assignmentType === "MANUAL").length;
            return {
                bookingId: updatedBooking._id,
                bookingReference: updatedBooking.bookingReference,
                bookingStatus: updatedBooking.status,
                assignmentStatus: updatedBooking.assignment?.status,
                coordinatorId,
                assignmentRound: updatedBooking.assignment?.currentRound,
                isReassignmentSelection: true,
                requestedByRole: activeReassignment?.requestedByRole,
                sentCoordinatorRequests,
                maxCoordinatorRequests: reassignmentRequestLimit,
                remainingCoordinatorRequests: Math.max(reassignmentRequestLimit - sentCoordinatorRequests, 0),
                message: "Reassignment request sent successfully. The current coordinator remains assigned until one replacement coordinator accepts.",
            };
        }
        // PREPARE RESCHEDULE COORDINATOR CHANGE
        let previousScheduledAt;
        if (isRescheduleSelection && targetScheduledAt) {
            booking.assignment ??= { status: "NOT_STARTED", currentRound: 1, requests: [] };
            booking.assignment.currentRound ??= 1;
            const existingPendingReschedule = booking.assignment.pendingReschedule;
            const samePendingSchedule = existingPendingReschedule?.requestedScheduledAt?.getTime() === targetScheduledAt.getTime();
            // NEW RESCHEDULE SELECTION ROUND Example: Original: Coordinator A accepted Date 1 User wants Date 2. A is unavailable. User now chooses Coordinator B. This starts a NEW assignment round.
            if (!samePendingSchedule) {
                const previousRound = booking.assignment.currentRound ?? 1;
                const previousCoordinatorId = booking.assignment.assignedCoordinatorId;
                previousScheduledAt = booking.scheduledAt;
                // Close the previous ACCEPTED assignment request as historical. DO NOT delete it. This fixes the bug where the old coordinator remained represented as ACCEPTED after replacement selection had already started.
                if (previousCoordinatorId) {
                    for (const request of booking.assignment.requests ?? []) {
                        if (request.coordinatorId?.toString() === previousCoordinatorId.toString() && request.status === "ACCEPTED" && (request.assignmentRound ?? 1) === previousRound) {
                            request.status = "SUPERSEDED";
                            request.closureReason = "RESCHEDULE_COORDINATOR_CHANGE";
                            // Do NOT overwrite respondedAt. respondedAt represents the time this coordinator originally accepted the booking.
                        }
                    }
                }
                // Start the assignment round for the requested new date.
                booking.assignment.currentRound = previousRound + 1;
                booking.assignment.pendingReschedule = {
                    ...(previousScheduledAt ? { previousScheduledAt } : {}),
                    requestedScheduledAt: targetScheduledAt,
                    reason: rescheduleReason.trim(),
                    requestedBy: new Types.ObjectId(selectedBy),
                    requestedAt: new Date(),
                    assignmentRound: booking.assignment.currentRound,
                };
            }
            else {
                // SAME RESCHEDULE ROUND Example: B was selected for Date 2. B rejected/timed out. User now selects C for SAME Date 2. Do NOT increment currentRound again. Do NOT recreate pendingReschedule.
                previousScheduledAt = existingPendingReschedule?.previousScheduledAt;
            }
            // Original manual selection deadline is no longer relevant during reschedule. Use booking.set() so Mongoose correctly tracks the nested unset.
            booking.set("assignment.assignmentExpiresAt", undefined);
        }
        // CREATE NEW ASSIGNMENT REQUEST assignCoordinatorRequest(): - creates a PENDING request - clears any previous active coordinator fields - sets assignment.status = PENDING_RESPONSE - sets booking.status = ASSIGNMENT_PENDING - creates BOOKING_ASSIGNMENT_REQUESTED outbox event It does NOT make the selected coordinator assigned immediately. assignedCoordinatorId is populated only when respondToAssignment() successfully accepts the coordinator's request.
        const updatedBooking = await this.assignCoordinatorRequest({ booking, coordinatorId, selectedBy, assignmentType, scheduledAt: targetScheduledAt });
        await this.invalidateBookingCache(bookingId);
        return {
            bookingId: updatedBooking._id,
            bookingReference: updatedBooking.bookingReference,
            bookingStatus: updatedBooking.status,
            assignmentStatus: updatedBooking.assignment?.status,
            coordinatorId,
            assignmentRound: updatedBooking.assignment?.currentRound,
            isRescheduleSelection,
            previousScheduledAt: previousScheduledAt ?? null,
            scheduledAt: targetScheduledAt,
            responseDeadlineAt: updatedBooking.assignment?.responseDeadlineAt,
            assignmentExpiresAt: updatedBooking.assignment?.assignmentExpiresAt,
            ...(isRescheduleSelection
                ? {
                    maxCoordinatorRequests: MAX_RESCHEDULE_USER_REQUESTS,
                    sentCoordinatorRequests: (updatedBooking.assignment?.requests ?? []).filter((request) => (request.assignmentRound ?? 1) === (updatedBooking.assignment?.currentRound ?? 1) && request.assignmentType === "MANUAL").length,
                }
                : {}),
            message: isRescheduleSelection ? "Coordinator request sent for reschedule. You may send requests to up to 3 coordinators; the first acceptance will complete the reschedule." : "Coordinator selected successfully",
        };
    }
    static async respondToAssignment(params) {
        const { bookingId, coordinatorId, action, reason } = params;
        if (!Types.ObjectId.isValid(bookingId)) {
            throw new Error("Invalid booking ID");
        }
        if (!Types.ObjectId.isValid(coordinatorId)) {
            throw new Error("Invalid coordinator ID");
        }
        if (!["ACCEPT", "REJECT"].includes(action)) {
            throw new Error("Invalid assignment action");
        }
        const session = await mongoose.startSession();
        let postCommitError = null;
        let shouldInvalidateCache = false;
        let result = {};
        try {
            await session.withTransaction(async () => {
                const booking = await Booking.findOne({ _id: bookingId, isDeleted: false }).session(session);
                if (!booking || !booking.assignment) {
                    throw new Error("Booking assignment not found");
                }
                const now = new Date();
                const currentRound = booking.assignment.currentRound ?? 1;
                const reassignment = booking.assignment.reassignment;
                const isReplacementRequest = Boolean(reassignment && reassignment.status === "REPLACEMENT_REQUESTED" && reassignment.assignmentRound === currentRound && (reassignment.mode === "AUTO" || reassignment.replacementCoordinatorId?.toString() === coordinatorId));
                // Normal assignment / reschedule: booking must be ASSIGNMENT_PENDING. Reassignment: booking intentionally remains ASSIGNED.
                if (!isReplacementRequest && booking.status !== "ASSIGNMENT_PENDING") {
                    throw new Error(`Cannot respond to assignment for ${booking.status} booking`);
                }
                if (isReplacementRequest && booking.status !== "ASSIGNED") {
                    throw new Error("Booking is no longer available for reassignment");
                }
                const currentRequest = booking.assignment.requests?.slice().reverse().find((request) => request.coordinatorId.toString() === coordinatorId && request.status === "PENDING" && (request.assignmentRound ?? 1) === currentRound);
                if (!currentRequest) {
                    throw new Error("Pending assignment request not found");
                }
                // If original coordinator already started execution, reassignment cannot continue.
                if (isReplacementRequest && booking.execution?.startedAt) {
                    if (!reassignment) {
                        throw new Error("Active reassignment not found");
                    }
                    currentRequest.status = "CANCELLED";
                    currentRequest.closureReason = "SYSTEM_CANCELLED";
                    currentRequest.respondedAt = now;
                    reassignment.status = "FAILED";
                    reassignment.failedAt = now;
                    reassignment.failureReason = "Booking execution already started";
                    await booking.save({ session });
                    shouldInvalidateCache = true;
                    postCommitError = new Error("Booking execution has already started and reassignment is no longer available");
                    return;
                }
                /*
                 * EXPIRED
                 */
                if (currentRequest.responseDeadlineAt <= now) {
                    currentRequest.status = "EXPIRED";
                    currentRequest.respondedAt = now;
                    if (isReplacementRequest) {
                        this.handleFailedReassignmentAttempt(booking, "Replacement coordinator response deadline expired");
                    }
                    else {
                        const hasOtherPending = booking.assignment.requests.some((request) => request.status === "PENDING" && (request.assignmentRound ?? 1) === currentRound);
                        booking.assignment.status = hasOtherPending ? "PENDING_RESPONSE" : "PENDING_SELECTION";
                        booking.status = "ASSIGNMENT_PENDING";
                    }
                    await booking.save({ session });
                    shouldInvalidateCache = true;
                    postCommitError = new Error("Coordinator response deadline has expired");
                    return;
                }
                currentRequest.respondedAt = now;
                // REJECT
                if (action === "REJECT") {
                    currentRequest.status = "REJECTED";
                    const trimmedReason = reason?.trim();
                    if (trimmedReason) {
                        currentRequest.rejectionReason = trimmedReason;
                    }
                    if (isReplacementRequest) {
                        this.handleFailedReassignmentAttempt(booking, trimmedReason ? `Replacement coordinator rejected: ${trimmedReason}` : "Replacement coordinator rejected the reassignment");
                    }
                    else {
                        const hasOtherPending = booking.assignment.requests.some((request) => request.status === "PENDING" && (request.assignmentRound ?? 1) === currentRound);
                        booking.assignment.status = hasOtherPending ? "PENDING_RESPONSE" : "PENDING_SELECTION";
                        booking.status = "ASSIGNMENT_PENDING";
                    }
                    await booking.save({ session });
                    shouldInvalidateCache = true;
                    result = {
                        bookingId: booking._id,
                        bookingStatus: booking.status,
                        assignmentStatus: booking.assignment.status,
                        rejectedCoordinatorId: coordinatorId,
                        assignmentRound: currentRound,
                        reassignment: booking.assignment.reassignment ?? null,
                    };
                    return;
                }
                // ACCEPT-TIME COORDINATOR AVAILABILITY REVALIDATION. Coordinator availability may have changed after the assignment request was created
                const requestScheduledAt = currentRequest.scheduledAt ?? booking.assignment?.pendingReschedule?.requestedScheduledAt ?? booking.scheduledAt;
                if (!requestScheduledAt) {
                    throw new Error("Booking schedule is missing");
                }
                const acceptingCoordinator = await User.findOne({
                    _id: coordinatorId,
                    role: "COORDINATOR",
                    isActive: true,
                    isDocumentVerified: true,
                    "coordinatorProfile.approvalStatus": "APPROVED",
                    "coordinatorProfile.availabilityStatus": "AVAILABLE",
                    "coordinatorProfile.unavailableDates": this.buildCoordinatorUnavailableDateFilter(requestScheduledAt),
                }).session(session);
                if (!acceptingCoordinator) {
                    currentRequest.status = "CANCELLED";
                    currentRequest.closureReason = "SYSTEM_CANCELLED";
                    currentRequest.respondedAt = now;
                    if (isReplacementRequest) {
                        this.handleFailedReassignmentAttempt(booking, "Replacement coordinator became unavailable for the booking date");
                    }
                    else {
                        const hasOtherPending = booking.assignment.requests.some((request) => request._id?.toString() !== currentRequest._id?.toString() && request.status === "PENDING" && (request.assignmentRound ?? 1) === currentRound);
                        booking.assignment.status = hasOtherPending ? "PENDING_RESPONSE" : "PENDING_SELECTION";
                        booking.status = "ASSIGNMENT_PENDING";
                    }
                    await booking.save({ session });
                    shouldInvalidateCache = true;
                    postCommitError = new Error("You are unavailable for this booking date");
                    return;
                }
                // ACCEPT TIME DAILY CAPACITY CHECK - Coordinator may have received other bookings after this request was originally created
                const capacityDate = new Date(requestScheduledAt);
                const capacityStartOfDay = new Date(capacityDate);
                capacityStartOfDay.setHours(0, 0, 0, 0);
                const capacityEndOfDay = new Date(capacityDate);
                capacityEndOfDay.setHours(23, 59, 59, 999);
                const assignedBookingCount = await Booking.countDocuments({
                    _id: { $ne: booking._id },
                    isDeleted: false,
                    "assignment.assignedCoordinatorId": new Types.ObjectId(coordinatorId),
                    scheduledAt: { $gte: capacityStartOfDay, $lte: capacityEndOfDay },
                    status: { $in: ["ASSIGNED", "IN_PROGRESS"] }
                }).session(session);
                const maxDailyBookings = acceptingCoordinator.coordinatorProfile?.maxDailyBookings ?? 5;
                // Coordinator has reached the limit
                if (assignedBookingCount >= maxDailyBookings) {
                    currentRequest.status = "CANCELLED";
                    currentRequest.closureReason = "SYSTEM_CANCELLED";
                    currentRequest.respondedAt = now;
                    if (isReplacementRequest) {
                        this.handleFailedReassignmentAttempt(booking, "Replacement coordinator reached the maximum booking limit for the selected date");
                    }
                    else {
                        const hasOtherPending = booking.assignment.requests.some((request) => request._id?.toString() !== currentRequest._id?.toString() && request.status === "PENDING" && (request.assignmentRound ?? 1) === currentRound);
                        booking.assignment.status = hasOtherPending ? "PENDING_RESPONSE" : "PENDING_SELECTION";
                        booking.status = "ASSIGNMENT_PENDING";
                    }
                    await booking.save({ session });
                    shouldInvalidateCache = true;
                    postCommitError = new Error("Maximum booking limit reached for this date");
                    return;
                }
                // REASSIGNMENT ACCEPTANCE Atomic A -> B transfer. A NEVER becomes null.
                if (isReplacementRequest) {
                    if (!reassignment) {
                        throw new Error("Active reassignment not found");
                    }
                    const previousCoordinatorId = reassignment.previousCoordinatorId;
                    if (!previousCoordinatorId) {
                        throw new Error("Previous coordinator not found for reassignment");
                    }
                    const claimed = await Booking.updateOne({
                        _id: booking._id,
                        status: "ASSIGNED",
                        "assignment.assignedCoordinatorId": previousCoordinatorId,
                        "assignment.currentRound": currentRound,
                        "assignment.reassignment.status": "REPLACEMENT_REQUESTED",
                        "assignment.reassignment.assignmentRound": currentRound,
                        "assignment.requests": {
                            $elemMatch: { coordinatorId: new Types.ObjectId(coordinatorId), status: "PENDING", assignmentRound: currentRound },
                        },
                        ...(reassignment.mode === "NOMINATED" ? { "assignment.reassignment.replacementCoordinatorId": new Types.ObjectId(coordinatorId) } : {}),
                    }, {
                        $set: {
                            "assignment.assignedCoordinatorId": new Types.ObjectId(coordinatorId),
                            "assignment.assignedAt": now,
                            "assignment.coordinatorAcceptedAt": now,
                            "assignment.status": "ACCEPTED",
                            "assignment.reassignment.status": "COMPLETED",
                            "assignment.reassignment.completedAt": now,
                            "assignment.reassignment.replacementCoordinatorId": new Types.ObjectId(coordinatorId),
                        },
                    }, { session });
                    if (claimed.modifiedCount === 0) {
                        throw new Error("Reassignment could not be completed because the booking state changed");
                    }
                    currentRequest.status = "ACCEPTED";
                    // Multiple USER reassignment requests may be pending together. First acceptance wins; every other pending request in the same reassignment round is immediately superseded.
                    for (const request of booking.assignment.requests ?? []) {
                        if (request._id?.toString() !== currentRequest._id?.toString() && request.status === "PENDING" && (request.assignmentRound ?? 1) === currentRound) {
                            request.status = "SUPERSEDED";
                            request.closureReason = "ANOTHER_COORDINATOR_ACCEPTED";
                            request.respondedAt = now;
                        }
                    }
                    // Close original accepted request only NOW, after replacement accepted.
                    for (const request of booking.assignment.requests ?? []) {
                        if (request.coordinatorId?.toString() === previousCoordinatorId.toString() && request.status === "ACCEPTED" && (request.assignmentRound ?? 1) < currentRound) {
                            request.status = "SUPERSEDED";
                            request.closureReason = "REASSIGNMENT_COMPLETED";
                        }
                    }
                    booking.status = "ASSIGNED";
                    booking.assignment.status = "ACCEPTED";
                    booking.assignment.assignedCoordinatorId = new Types.ObjectId(coordinatorId);
                    booking.assignment.assignedAt = now;
                    booking.assignment.coordinatorAcceptedAt = now;
                    reassignment.status = "COMPLETED";
                    reassignment.completedAt = now;
                    await booking.save({ session });
                    await User.updateOne({ _id: coordinatorId }, { $inc: { "coordinatorProfile.totalAssignedBookings": 1 } }, { session });
                    if (booking.userId) {
                        await OutboxService.createEvent({
                            eventId: `BOOKING.ASSIGNED:${booking._id.toString()}:${currentRound}`,
                            eventType: DOMAIN_EVENTS.BOOKING_ASSIGNED,
                            aggregateType: "BOOKING",
                            aggregateId: booking._id.toString(),
                            payload: {
                                bookingId: booking._id.toString(),
                                bookingReference: booking.bookingReference,
                                userId: booking.userId.toString(),
                                coordinatorId,
                                scheduledAt: booking.scheduledAt ?? null,
                            },
                            session,
                        });
                    }
                    shouldInvalidateCache = true;
                    result = {
                        bookingId: booking._id,
                        bookingReference: booking.bookingReference,
                        bookingStatus: "ASSIGNED",
                        assignmentStatus: "ACCEPTED",
                        previousCoordinatorId,
                        coordinatorId,
                        reassigned: true,
                        assignmentRound: currentRound,
                        acceptedAt: now,
                    };
                    return;
                }
                // EXISTING NORMAL / RESCHEDULE ACCEPTANCE
                const claimed = await Booking.updateOne({
                    _id: booking._id,
                    status: "ASSIGNMENT_PENDING",
                    $or: [
                        { "assignment.assignedCoordinatorId": { $exists: false } },
                        { "assignment.assignedCoordinatorId": null },
                    ],
                }, {
                    $set: {
                        status: "ASSIGNED",
                        "assignment.status": "ACCEPTED",
                        "assignment.assignedCoordinatorId": new Types.ObjectId(coordinatorId),
                        "assignment.assignedAt": now,
                        "assignment.coordinatorAcceptedAt": now,
                    },
                }, { session });
                if (claimed.modifiedCount === 0) {
                    throw new Error("This booking has already been accepted by another coordinator");
                }
                currentRequest.status = "ACCEPTED";
                for (const request of booking.assignment.requests) {
                    if (request._id?.toString() !== currentRequest._id?.toString() && request.status === "PENDING" && (request.assignmentRound ?? 1) === currentRound) {
                        request.status = "SUPERSEDED";
                        request.closureReason = "ANOTHER_COORDINATOR_ACCEPTED";
                        request.respondedAt = now;
                    }
                }
                // Existing reschedule logic.
                const pendingReschedule = booking.assignment.pendingReschedule;
                const isPendingRescheduleForCurrentRound = Boolean(pendingReschedule && pendingReschedule.assignmentRound === currentRound);
                if (pendingReschedule && isPendingRescheduleForCurrentRound) {
                    booking.rescheduleHistory ??= [];
                    booking.rescheduleHistory.push({
                        ...(pendingReschedule.previousScheduledAt ? { previousScheduledAt: pendingReschedule.previousScheduledAt } : {}),
                        newScheduledAt: pendingReschedule.requestedScheduledAt,
                        reason: pendingReschedule.reason,
                        rescheduledBy: pendingReschedule.requestedBy,
                        rescheduledByRole: "USER",
                        rescheduledAt: now,
                    });
                    booking.scheduledAt = pendingReschedule.requestedScheduledAt;
                    booking.set("assignment.pendingReschedule", undefined);
                }
                booking.status = "ASSIGNED";
                booking.assignment.status = "ACCEPTED";
                booking.assignment.assignedCoordinatorId = new Types.ObjectId(coordinatorId);
                booking.assignment.assignedAt = now;
                booking.assignment.coordinatorAcceptedAt = now;
                booking.set("assignment.responseDeadlineAt", undefined);
                booking.set("assignment.assignmentExpiresAt", undefined);
                await booking.save({ session });
                await User.updateOne({ _id: coordinatorId }, { $inc: { "coordinatorProfile.totalAssignedBookings": 1 } }, { session });
                if (booking.userId) {
                    await OutboxService.createEvent({
                        eventId: `BOOKING.ASSIGNED:${booking._id.toString()}:${currentRound}`,
                        eventType: DOMAIN_EVENTS.BOOKING_ASSIGNED,
                        aggregateType: "BOOKING",
                        aggregateId: booking._id.toString(),
                        payload: {
                            bookingId: booking._id.toString(),
                            bookingReference: booking.bookingReference,
                            userId: booking.userId.toString(),
                            coordinatorId,
                            scheduledAt: booking.scheduledAt ?? null,
                        },
                        session,
                    });
                    if (pendingReschedule && isPendingRescheduleForCurrentRound) {
                        await OutboxService.createEvent({
                            eventId: `BOOKING.RESCHEDULED:${booking._id.toString()}:${pendingReschedule.requestedScheduledAt.getTime()}`,
                            eventType: DOMAIN_EVENTS.BOOKING_RESCHEDULED,
                            aggregateType: "BOOKING",
                            aggregateId: booking._id.toString(),
                            payload: {
                                bookingId: booking._id.toString(),
                                bookingReference: booking.bookingReference,
                                userId: booking.userId.toString(),
                                coordinatorId,
                                previousScheduledAt: pendingReschedule.previousScheduledAt ?? null,
                                scheduledAt: pendingReschedule.requestedScheduledAt,
                                reason: pendingReschedule.reason,
                            },
                            session,
                        });
                    }
                }
                shouldInvalidateCache = true;
                result = {
                    bookingId: booking._id,
                    bookingReference: booking.bookingReference,
                    bookingStatus: booking.status,
                    assignmentStatus: booking.assignment.status,
                    coordinatorId,
                    acceptedAt: now,
                    scheduledAt: booking.scheduledAt,
                    assignmentRound: currentRound,
                    rescheduled: isPendingRescheduleForCurrentRound,
                    reassigned: false,
                };
            });
            if (shouldInvalidateCache) {
                await this.invalidateBookingCache(bookingId);
            }
            if (postCommitError) {
                throw postCommitError;
            }
            return result;
        }
        finally {
            await session.endSession();
        }
    }
    static async requestReassignment(params) {
        const { bookingId, requestedBy, requestedByRole, reason } = params;
        if (!Types.ObjectId.isValid(bookingId)) {
            throw new Error("Invalid booking ID");
        }
        if (!Types.ObjectId.isValid(requestedBy)) {
            throw new Error("Invalid requester ID");
        }
        if (!reason?.trim()) {
            throw new Error("Reassignment reason is required");
        }
        const session = await mongoose.startSession();
        let result = {};
        try {
            await session.withTransaction(async () => {
                const booking = await Booking.findOne({ _id: bookingId, isDeleted: false }).session(session);
                if (!booking) {
                    throw new Error("Booking not found");
                }
                if (booking.status !== "ASSIGNED") {
                    throw new Error("Reassignment is available only for an assigned booking");
                }
                if (booking.execution?.startedAt) {
                    throw new Error("Reassignment cannot be requested after execution starts");
                }
                if (!booking.assignment || booking.assignment.status !== "ACCEPTED" || !booking.assignment.assignedCoordinatorId) {
                    throw new Error("Booking must have an accepted coordinator before reassignment");
                }
                if (booking.assignment.reassignment && ["PENDING_REPLACEMENT", "REPLACEMENT_REQUESTED"].includes(booking.assignment.reassignment.status)) {
                    throw new Error("A reassignment request is already in progress");
                }
                const currentCoordinatorId = booking.assignment.assignedCoordinatorId;
                const isOwner = booking.userId?.toString() === requestedBy;
                const isAssignedCoordinator = currentCoordinatorId.toString() === requestedBy;
                const isAdmin = requestedByRole === "ADMIN";
                const isSystem = requestedByRole === "SYSTEM";
                if (requestedByRole === "USER" && !isOwner) {
                    throw new Error("Only the booking owner can request reassignment");
                }
                if (requestedByRole === "COORDINATOR" && !isAssignedCoordinator) {
                    throw new Error("Only the assigned coordinator can request reassignment");
                }
                if (!isOwner && !isAssignedCoordinator && !isAdmin && !isSystem) {
                    throw new Error("You are not authorized to request reassignment");
                }
                const now = new Date();
                if (requestedByRole === "USER" && booking.scheduledAt) {
                    const timeUntilBooking = booking.scheduledAt.getTime() - now.getTime();
                    if (timeUntilBooking <= 0) {
                        throw new Error("Reassignment cannot be requested after the scheduled booking time");
                    }
                    if (timeUntilBooking <= USER_REASSIGNMENT_CUTOFF_MS) {
                        throw new Error("Reassignment cannot be requested within 2 hours of the scheduled booking");
                    }
                }
                const previousRound = booking.assignment.currentRound ?? 1;
                // Close stale pending requests from the old round, but retain the currently accepted coordinator until a replacement accepts.
                for (const request of booking.assignment.requests ?? []) {
                    if (request.status === "PENDING" && (request.assignmentRound ?? 1) === previousRound) {
                        request.status = "CANCELLED";
                        request.closureReason = "REASSIGNMENT_STARTED";
                        request.respondedAt = now;
                    }
                }
                const newRound = previousRound + 1;
                booking.assignment.currentRound = newRound;
                const mode = "AUTO";
                booking.assignment.reassignment = {
                    requestedBy: new Types.ObjectId(requestedBy),
                    requestedByRole,
                    reason: reason.trim(),
                    requestedAt: now,
                    previousCoordinatorId: new Types.ObjectId(currentCoordinatorId.toString()),
                    assignmentRound: newRound,
                    mode,
                    status: "PENDING_REPLACEMENT",
                };
                booking.set("assignment.pendingReschedule", undefined);
                booking.set("assignment.assignmentExpiresAt", undefined);
                // Safe handover invariant: A remains the active coordinator until the replacement actually accepts.
                booking.status = "ASSIGNED";
                booking.assignment.status = "ACCEPTED";
                await booking.save({ session });
                result = {
                    bookingId: booking._id,
                    bookingReference: booking.bookingReference,
                    bookingStatus: booking.status,
                    assignmentStatus: booking.assignment.status,
                    currentCoordinatorId,
                    assignmentRound: booking.assignment.currentRound,
                    reassignment: booking.assignment.reassignment,
                    maxCoordinatorRequests: this.getReassignmentManualRequestLimit(requestedByRole),
                    message: `Reassignment requested successfully. You may send requests to up to ${this.getReassignmentManualRequestLimit(requestedByRole)} replacement coordinators. The current coordinator remains assigned until a replacement accepts; automatic fallback starts if the manual phase is exhausted.`,
                };
            });
        }
        finally {
            await session.endSession();
        }
        await this.invalidateBookingCache(bookingId);
        return result;
    }
    static async getCoordinatorBookingList(params) {
        const { coordinatorId, view, status, page = 1, limit = 20, sortBy, sortOrder } = params;
        if (!Types.ObjectId.isValid(coordinatorId)) {
            throw new Error("Invalid coordinator ID");
        }
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
        const skip = (safePage - 1) * safeLimit;
        const coordinatorObjectId = new Types.ObjectId(coordinatorId);
        const query = { isDeleted: false };
        let selectFields = {};
        let sort = {};
        if (view === "REQUESTS") {
            query.$or = [
                { status: "ASSIGNMENT_PENDING", "assignment.status": "PENDING_RESPONSE" },
                { status: "ASSIGNED", "assignment.reassignment.status": "REPLACEMENT_REQUESTED" },
            ];
            query["assignment.requests"] = { $elemMatch: { coordinatorId: coordinatorObjectId, status: "PENDING", responseDeadlineAt: { $gt: new Date() } } };
            selectFields = {
                userId: 1,
                bookingReference: 1,
                customerDetails: 1,
                // Contains: SERVICE: - serviceConfiguration.serviceSnapshot - serviceConfiguration.tier - serviceConfiguration.location PACKAGE: - packageConfiguration.packageSnapshot - selectedServices[].tier - selectedServices[].location - addonServices[].tier - addonServices[].location
                entries: 1,
                scheduledAt: 1,
                assignment: 1,
                pricing: 1,
                notes: 1,
                createdAt: 1,
            };
            sort = { "assignment.requests.requestedAt": sortOrder === "asc" ? 1 : -1 };
        }
        else {
            query["assignment.assignedCoordinatorId"] = coordinatorObjectId;
            query["assignment.status"] = "ACCEPTED";
            if (status) {
                query.status = status;
            }
            else {
                query.status = { $in: ["ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] };
            }
            selectFields = {
                userId: 1,
                bookingReference: 1,
                status: 1,
                customerDetails: 1,
                // Includes complete package/service snapshot, tier and location details.
                entries: 1,
                scheduledAt: 1,
                assignment: 1,
                execution: 1,
                pricing: 1,
                completedAt: 1,
                notes: 1,
                createdAt: 1,
            };
            const allowedSortFields = new Set(["scheduledAt", "createdAt", "completedAt", "status", "pricing.grandTotal"]);
            const safeSortBy = sortBy && allowedSortFields.has(sortBy) ? sortBy : "scheduledAt";
            sort = { [safeSortBy]: sortOrder === "desc" ? -1 : 1 };
        }
        const [data, total] = await Promise.all([
            Booking.find(query).select(selectFields).populate({ path: "userId", select: { fullName: 1, profileImage: 1, phoneNumber: 1, email: 1, userReference: 1 } }).sort(sort).skip(skip).limit(safeLimit).lean(),
            Booking.countDocuments(query),
        ]);
        const formattedData = data.map((booking) => {
            const populatedUser = booking.userId && typeof booking.userId === "object" && "_id" in booking.userId ? booking.userId : null;
            const bookingEntries = booking.entries?.map((entry) => {
                if (entry.entryType === "SERVICE") {
                    const service = entry.serviceConfiguration;
                    return {
                        entryType: "SERVICE",
                        service: service ? {
                            serviceId: service.serviceId,
                            name: service.serviceSnapshot?.name,
                            shortDescription: service.serviceSnapshot?.shortDescription,
                            thumbnailImage: service.serviceSnapshot?.thumbnailImage,
                            serviceReference: service.serviceSnapshot?.serviceReference,
                            serviceRole: service.serviceRole,
                            subService: service.subService ?? null,
                            tier: service.tier ? { tierId: service.tier.tierId, name: service.tier.name } : null,
                            location: service.location ? { locationId: service.location.locationId, name: service.location.name } : null,
                            components: service.components ?? [],
                            pricing: service.pricing,
                        } : null,
                    };
                }
                if (entry.entryType === "PACKAGE") {
                    const packageConfiguration = entry.packageConfiguration;
                    const formatService = (service) => ({
                        serviceId: service.serviceId,
                        name: service.serviceSnapshot?.name,
                        shortDescription: service.serviceSnapshot?.shortDescription,
                        thumbnailImage: service.serviceSnapshot?.thumbnailImage,
                        serviceReference: service.serviceSnapshot?.serviceReference,
                        serviceRole: service.serviceRole,
                        subService: service.subService ?? null,
                        tier: service.tier ? { tierId: service.tier.tierId, name: service.tier.name } : null,
                        location: service.location ? { locationId: service.location.locationId, name: service.location.name } : null,
                        components: service.components ?? [],
                        pricing: service.pricing,
                    });
                    return {
                        entryType: "PACKAGE",
                        package: packageConfiguration ? {
                            packageId: packageConfiguration.packageId,
                            name: packageConfiguration.packageSnapshot?.name,
                            shortDescription: packageConfiguration.packageSnapshot?.shortDescription,
                            thumbnailImage: packageConfiguration.packageSnapshot?.thumbnailImage,
                            packageReference: packageConfiguration.packageSnapshot?.packageReference,
                            selectedServices: packageConfiguration.selectedServices?.map(formatService) ?? [],
                            addonServices: packageConfiguration.addonServices?.map(formatService) ?? [],
                            pricing: packageConfiguration.pricing,
                        } : null,
                    };
                }
                return entry;
            }) ?? [];
            const { entries: _entries, userId: _userId, ...bookingData } = booking;
            return {
                ...bookingData,
                userId: populatedUser?._id ?? booking.userId ?? null,
                user: populatedUser ? {
                    userId: populatedUser._id,
                    fullName: populatedUser.fullName,
                    profileImage: populatedUser.profileImage,
                    phoneNumber: populatedUser.phoneNumber,
                    email: populatedUser.email,
                    userReference: populatedUser.userReference,
                } : null,
                entries: bookingEntries,
            };
        });
        return { view, data: formattedData, total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) };
    }
    static async processAssignmentTimeouts() {
        const now = new Date();
        const bookings = await Booking.find({
            isDeleted: false,
            "assignment.requests": { $elemMatch: { status: "PENDING", responseDeadlineAt: { $lte: now } } },
            $or: [
                { status: "ASSIGNMENT_PENDING", "assignment.status": "PENDING_RESPONSE" },
                { status: "ASSIGNED", "assignment.reassignment.status": "REPLACEMENT_REQUESTED" },
            ],
        });
        const result = { processed: 0, expiredRequests: 0, waitingForSelection: 0, reassignmentRetry: 0, reassignmentFailed: 0 };
        for (const booking of bookings) {
            if (!booking.assignment) {
                continue;
            }
            const currentRound = booking.assignment.currentRound ?? 1;
            let changed = false;
            for (const request of booking.assignment.requests ?? []) {
                if (request.status === "PENDING" && (request.assignmentRound ?? 1) === currentRound && request.responseDeadlineAt <= now) {
                    request.status = "EXPIRED";
                    request.respondedAt = now;
                    result.expiredRequests += 1;
                    changed = true;
                }
            }
            if (!changed) {
                continue;
            }
            result.processed += 1;
            const reassignment = booking.assignment.reassignment;
            const isActiveReassignment = booking.status === "ASSIGNED" && reassignment?.status === "REPLACEMENT_REQUESTED" && reassignment.assignmentRound === currentRound;
            // SAFE REASSIGNMENT TIMEOUT
            if (isActiveReassignment) {
                this.handleFailedReassignmentAttempt(booking, "Replacement coordinator response deadline expired");
                if (reassignment.status === "PENDING_REPLACEMENT") {
                    result.reassignmentRetry += 1;
                }
                else if (reassignment.status === "FAILED") {
                    result.reassignmentFailed += 1;
                }
                await booking.save();
                await this.invalidateBookingCache(booking._id.toString());
                continue;
            }
            // Existing normal assignment timeout.
            const hasPending = booking.assignment.requests.some((request) => request.status === "PENDING" && (request.assignmentRound ?? 1) === currentRound);
            if (hasPending) {
                booking.assignment.status = "PENDING_RESPONSE";
                await booking.save();
                continue;
            }
            booking.assignment.status = "PENDING_SELECTION";
            booking.status = "ASSIGNMENT_PENDING";
            result.waitingForSelection += 1;
            await booking.save();
            await this.invalidateBookingCache(booking._id.toString());
        }
        return result;
    }
    static async getBookingExecution(params) {
        const { bookingId, userId, role } = params;
        const booking = await Booking.findOne({ _id: bookingId, isDeleted: false }).select({
            userId: 1,
            beneficiaryUserId: 1,
            bookingReference: 1,
            status: 1,
            scheduledAt: 1,
            assignment: 1,
            execution: 1,
            completedAt: 1,
        }).populate("assignment.assignedCoordinatorId", "fullName phoneNumber profileImage").lean();
        if (!booking) {
            throw new Error("Booking not found");
        }
        if (role === Role.USER) {
            const isOwner = booking.userId?.toString() === userId;
            const isBeneficiary = booking.beneficiaryUserId?.toString() === userId;
            if (!isOwner && !isBeneficiary) {
                throw new Error("You are not authorized to view this booking execution");
            }
        }
        if (role === Role.COORDINATOR) {
            const coordinator = booking.assignment?.assignedCoordinatorId;
            const coordinatorId = coordinator?._id?.toString() ?? coordinator?.toString();
            if (coordinatorId !== userId) {
                throw new Error("You are not authorized to view this booking execution");
            }
        }
        return {
            bookingId: booking._id,
            bookingReference: booking.bookingReference,
            bookingStatus: booking.status,
            scheduledAt: booking.scheduledAt,
            coordinator: booking.assignment?.assignedCoordinatorId,
            assignmentStatus: booking.assignment?.status,
            execution: booking.execution ?? { stage: "NOT_STARTED", serviceExecutions: [], milestones: [], progressPercentage: 0 },
            completedAt: booking.completedAt,
        };
    }
    static async markCoordinatorArrived(params) {
        const { bookingId, coordinatorId } = params;
        if (!Types.ObjectId.isValid(bookingId)) {
            throw new Error("Invalid booking ID");
        }
        if (!Types.ObjectId.isValid(coordinatorId)) {
            throw new Error("Invalid coordinator ID");
        }
        const session = await mongoose.startSession();
        let updatedBooking = null;
        try {
            await session.withTransaction(async () => {
                const initialBooking = await Booking.findOne({ _id: bookingId, isDeleted: false }).session(session);
                if (!initialBooking) {
                    throw new Error("Booking not found");
                }
                if (initialBooking.status !== "ASSIGNED") {
                    throw new Error("Coordinator can arrive only for an assigned booking");
                }
                if (initialBooking.assignment?.assignedCoordinatorId?.toString() !== coordinatorId) {
                    throw new Error("Coordinator is not assigned to this booking");
                }
                const now = new Date();
                // Atomically claim execution start while this coordinator is stillthe active coordinator. This prevents the race where replacement Baccepts at the same moment current coordinator A arrives.
                const arrivalClaim = await Booking.updateOne({
                    _id: initialBooking._id,
                    isDeleted: false,
                    status: "ASSIGNED",
                    "assignment.assignedCoordinatorId": new Types.ObjectId(coordinatorId),
                    $or: [
                        { "execution.startedAt": { $exists: false } },
                        { "execution.startedAt": null },
                    ],
                }, { $set: { status: "IN_PROGRESS", "execution.startedAt": now } }, { session });
                if (arrivalClaim.modifiedCount === 0) {
                    throw new Error("Booking state changed before coordinator arrival could be confirmed");
                }
                const booking = await Booking.findById(initialBooking._id).session(session);
                if (!booking) {
                    throw new Error("Booking not found after arrival claim");
                }
                // Once the responsible coordinator has atomically started execution, any unfinished reassignment is closed and its pending request can no longer be accepted.
                const activeReassignment = booking.assignment?.reassignment;
                if (activeReassignment && ["PENDING_REPLACEMENT", "REPLACEMENT_REQUESTED"].includes(activeReassignment.status)) {
                    const currentRound = booking.assignment?.currentRound ?? 1;
                    for (const request of booking.assignment?.requests ?? []) {
                        if (request.status === "PENDING" && (request.assignmentRound ?? 1) === currentRound) {
                            request.status = "CANCELLED";
                            request.closureReason = "SYSTEM_CANCELLED";
                            request.respondedAt = now;
                        }
                    }
                    activeReassignment.status = "FAILED";
                    activeReassignment.failedAt = now;
                    activeReassignment.failureReason = "Current coordinator arrived and booking execution started";
                }
                booking.execution ??= { stage: "NOT_STARTED", serviceExecutions: [], milestones: [], progressPercentage: 0 };
                if (!booking.execution.serviceExecutions || booking.execution.serviceExecutions.length === 0) {
                    const serviceExecutions = this.buildServiceExecutions(booking);
                    if (serviceExecutions.length === 0) {
                        throw new Error("Booking does not contain any executable services");
                    }
                    booking.execution.serviceExecutions = serviceExecutions;
                }
                booking.status = "IN_PROGRESS";
                booking.execution.stage = "CUSTOMER_VERIFICATION_PENDING";
                booking.execution.startedAt ??= now;
                this.addMilestoneIfMissing(booking, "COORDINATOR_ARRIVED", coordinatorId);
                await booking.save({ session });
                if (booking.userId) {
                    await OutboxService.createEvent({
                        eventId: `BOOKING.STARTED:${booking._id.toString()}`,
                        eventType: DOMAIN_EVENTS.BOOKING_STARTED,
                        aggregateType: "BOOKING",
                        aggregateId: booking._id.toString(),
                        payload: { bookingId: booking._id.toString(), bookingReference: booking.bookingReference, userId: booking.userId.toString(), coordinatorId, startedAt: booking.execution?.startedAt ?? now },
                        session,
                    });
                }
                updatedBooking = booking;
            });
        }
        finally {
            await session.endSession();
        }
        if (!updatedBooking?.userId) {
            throw new Error("Booking user not found");
        }
        if (!updatedBooking.assignment?.assignedCoordinatorId) {
            throw new Error("Assigned coordinator not found");
        }
        await ChatConversationService.createForBooking({ bookingId: updatedBooking._id.toString(), userId: updatedBooking.userId.toString(), coordinatorId: updatedBooking.assignment.assignedCoordinatorId.toString() });
        await this.invalidateBookingCache(bookingId);
        return {
            bookingId: updatedBooking._id,
            bookingStatus: updatedBooking.status,
            executionStage: updatedBooking.execution.stage,
            startedAt: updatedBooking.execution.startedAt,
            serviceExecutions: updatedBooking.execution.serviceExecutions,
            milestones: updatedBooking.execution.milestones,
        };
    }
    static async verifyBookingOtp(params) {
        const { bookingId, otp, verifiedBy } = params;
        const booking = await Booking.findOne({ _id: bookingId, isDeleted: false }).select("+execution.otpVerification.otpHash");
        if (!booking) {
            throw new Error("Booking not found");
        }
        if (booking.status !== "IN_PROGRESS") {
            throw new Error("Booking must be in progress before OTP verification");
        }
        if (booking.assignment?.assignedCoordinatorId?.toString() !== verifiedBy) {
            throw new Error("Only the assigned coordinator can verify this OTP");
        }
        if (booking.execution?.stage !== "CUSTOMER_VERIFICATION_PENDING") {
            throw new Error("Booking is not waiting for OTP verification");
        }
        if (!otp?.trim()) {
            throw new Error("OTP is required");
        }
        booking.execution ??= { stage: "CUSTOMER_VERIFICATION_PENDING", serviceExecutions: [], milestones: [], progressPercentage: 0 };
        booking.execution.otpVerification ??= { status: "PENDING", attempts: 0 };
        booking.execution.otpVerification.attempts = (booking.execution.otpVerification.attempts ?? 0) + 1;
        const isValid = await this.validateBookingOtp(booking, otp.trim());
        if (!isValid) {
            if ((booking.execution.otpVerification.attempts ?? 0) >= MAX_OTP_VERIFICATION_ATTEMPTS) {
                booking.execution.otpVerification.status = "FAILED";
            }
            else {
                booking.execution.otpVerification.status = "PENDING";
            }
            await booking.save();
            throw new Error("Invalid OTP");
        }
        const now = new Date();
        booking.execution.otpVerification.status = "VERIFIED";
        booking.execution.otpVerification.verifiedAt = now;
        booking.execution.otpVerification.verifiedBy = new Types.ObjectId(verifiedBy);
        delete booking.execution.otpVerification.otpHash;
        booking.execution.stage = "SERVICE_EXECUTION";
        this.addMilestoneIfMissing(booking, "OTP_VERIFIED", verifiedBy);
        await booking.save();
        await this.invalidateBookingCache(bookingId);
        return {
            bookingId: booking._id,
            otpStatus: booking.execution.otpVerification.status,
            executionStage: booking.execution.stage,
            verifiedAt: booking.execution.otpVerification.verifiedAt,
        };
    }
    static async startBookingService(params) {
        const { bookingId, executionId, startedBy } = params;
        const booking = await Booking.findOne({ _id: bookingId, isDeleted: false });
        if (!booking) {
            throw new Error("Booking not found");
        }
        if (booking.status !== "IN_PROGRESS") {
            throw new Error("Booking must be in progress before starting a service");
        }
        if (booking.assignment?.assignedCoordinatorId?.toString() !== startedBy) {
            throw new Error("Only the assigned coordinator can start this service");
        }
        if (booking.execution?.otpVerification?.status !== "VERIFIED") {
            throw new Error("Customer OTP must be verified before starting services");
        }
        const serviceExecution = booking.execution.serviceExecutions.find((service) => service.executionId === executionId);
        if (!serviceExecution) {
            throw new Error("Service execution not found");
        }
        if (serviceExecution.status !== "PENDING") {
            throw new Error(`Cannot start service with status ${serviceExecution.status}`);
        }
        serviceExecution.status = "IN_PROGRESS";
        serviceExecution.startedAt = new Date();
        booking.execution.stage = "SERVICE_EXECUTION";
        this.addMilestoneIfMissing(booking, "SERVICE_STARTED", startedBy);
        await booking.save();
        await this.invalidateBookingCache(bookingId);
        return {
            bookingId: booking._id,
            executionId,
            serviceId: serviceExecution.serviceId,
            status: serviceExecution.status,
            startedAt: serviceExecution.startedAt,
        };
    }
    static async completeBookingService(params) {
        const { bookingId, executionId, completedBy, notes } = params;
        const booking = await Booking.findOne({ _id: bookingId, isDeleted: false });
        if (!booking) {
            throw new Error("Booking not found");
        }
        if (booking.status !== "IN_PROGRESS" || !booking.execution) {
            throw new Error("Booking execution is not active");
        }
        if (booking.assignment?.assignedCoordinatorId?.toString() !== completedBy) {
            throw new Error("Only the assigned coordinator can complete this service");
        }
        const serviceExecution = booking.execution.serviceExecutions.find((service) => service.executionId === executionId);
        if (!serviceExecution) {
            throw new Error("Service execution not found");
        }
        if (serviceExecution.status !== "IN_PROGRESS") {
            throw new Error("Only an in-progress service can be completed");
        }
        serviceExecution.status = "COMPLETED";
        serviceExecution.completedAt = new Date();
        serviceExecution.completedBy = new Types.ObjectId(completedBy);
        if (notes?.trim()) {
            serviceExecution.notes = notes.trim();
        }
        booking.execution.progressPercentage = this.calculateExecutionProgress(booking.execution.serviceExecutions);
        const allServicesResolved = booking.execution.serviceExecutions.length > 0 && booking.execution.serviceExecutions.every((service) => service.status === "COMPLETED" || service.status === "SKIPPED" || service.status === "CANCELLED");
        if (allServicesResolved) {
            this.addMilestoneIfMissing(booking, "ALL_SERVICES_COMPLETED", completedBy);
            booking.execution.stage = "FINALIZATION";
        }
        await booking.save();
        await this.invalidateBookingCache(bookingId);
        return {
            bookingId: booking._id,
            executionId,
            serviceId: serviceExecution.serviceId,
            serviceStatus: serviceExecution.status,
            progressPercentage: booking.execution.progressPercentage,
            executionStage: booking.execution.stage,
            allServicesResolved,
        };
    }
    static async skipBookingService(params) {
        const { bookingId, executionId, skippedBy, reason } = params;
        const booking = await Booking.findOne({ _id: bookingId, isDeleted: false });
        if (!booking) {
            throw new Error("Booking not found");
        }
        if (booking.status !== "IN_PROGRESS" || !booking.execution) {
            throw new Error("Booking execution is not active");
        }
        if (booking.assignment?.assignedCoordinatorId?.toString() !== skippedBy) {
            throw new Error("Only the assigned coordinator can skip this service");
        }
        const serviceExecution = booking.execution.serviceExecutions.find((service) => service.executionId === executionId);
        if (!serviceExecution) {
            throw new Error("Service execution not found");
        }
        if (!["PENDING", "IN_PROGRESS"].includes(serviceExecution.status)) {
            throw new Error(`Cannot skip service with status ${serviceExecution.status}`);
        }
        serviceExecution.status = "SKIPPED";
        serviceExecution.completedAt = new Date();
        serviceExecution.completedBy = new Types.ObjectId(skippedBy);
        serviceExecution.notes = reason.trim();
        booking.execution.progressPercentage = this.calculateExecutionProgress(booking.execution.serviceExecutions);
        const allServicesResolved = booking.execution.serviceExecutions.length > 0 && booking.execution.serviceExecutions.every((service) => service.status === "COMPLETED" || service.status === "SKIPPED" || service.status === "CANCELLED");
        if (allServicesResolved) {
            this.addMilestoneIfMissing(booking, "ALL_SERVICES_COMPLETED", skippedBy);
            booking.execution.stage = "FINALIZATION";
        }
        await booking.save();
        await this.invalidateBookingCache(bookingId);
        return {
            bookingId: booking._id,
            executionId,
            serviceStatus: serviceExecution.status,
            progressPercentage: booking.execution.progressPercentage,
            executionStage: booking.execution.stage,
            allServicesResolved,
        };
    }
    static async addBookingMilestone(params) {
        const { bookingId, code, notes, completedBy } = params;
        const allowedMilestones = ["COORDINATOR_ARRIVED", "OTP_VERIFIED", "SERVICE_STARTED", "CUSTOMER_DETAILS_VERIFIED", "DOCUMENTS_COLLECTED", "FAMILY_TREE_STARTED", "FAMILY_TREE_COMPLETED", "ALL_SERVICES_COMPLETED", "FINAL_REPORT_GENERATED"];
        if (!allowedMilestones.includes(code)) {
            throw new Error("Invalid milestone code");
        }
        const booking = await Booking.findOne({ _id: bookingId, isDeleted: false });
        if (!booking) {
            throw new Error("Booking not found");
        }
        if (booking.assignment?.assignedCoordinatorId?.toString() !== completedBy) {
            throw new Error("Only the assigned coordinator can update execution milestones");
        }
        if (!["IN_PROGRESS", "ASSIGNED"].includes(booking.status)) {
            throw new Error("Milestones cannot be added at the current booking stage");
        }
        booking.execution ??= { stage: "NOT_STARTED", serviceExecutions: [], milestones: [], progressPercentage: 0 };
        const alreadyCompleted = booking.execution.milestones.some((milestone) => milestone.code === code);
        if (alreadyCompleted) {
            throw new Error("Milestone has already been completed");
        }
        this.addMilestoneIfMissing(booking, code, completedBy, notes?.trim());
        switch (code) {
            case "FINAL_REPORT_GENERATED":
                booking.execution.stage = "FINALIZATION";
                break;
            case "ALL_SERVICES_COMPLETED":
                booking.execution.stage = "FINALIZATION";
                break;
        }
        await booking.save();
        await this.invalidateBookingCache(bookingId);
        return {
            bookingId: booking._id,
            code,
            executionStage: booking.execution.stage,
            milestones: booking.execution.milestones,
        };
    }
    static async completeBookingExecution(params) {
        const { bookingId, completedBy, notes, proofUrls } = params;
        const booking = await Booking.findOne({ _id: bookingId, isDeleted: false });
        if (!booking) {
            throw new Error("Booking not found");
        }
        const assignedCoordinatorId = booking.assignment?.assignedCoordinatorId;
        if (!assignedCoordinatorId) {
            throw new Error("Assigned coordinator not found");
        }
        //CRITICAL AUTH CHECK
        if (assignedCoordinatorId.toString() !== completedBy) {
            throw new Error("Only the assigned coordinator can complete this booking");
        }
        if (booking.assignment?.status !== "ACCEPTED") {
            throw new Error("Booking does not have an accepted coordinator");
        }
        if (booking.status !== "IN_PROGRESS") {
            throw new Error("Only an in-progress booking can be completed");
        }
        if (!booking.execution) {
            throw new Error("Booking execution details not found");
        }
        //OTP should have been successfullyverified.
        if (booking.execution.otpVerification?.status !== "VERIFIED") {
            throw new Error("Customer OTP must be verified before completing booking");
        }
        const serviceExecutions = booking.execution.serviceExecutions;
        const allServicesResolved = serviceExecutions.length > 0 && serviceExecutions.every((service) => service.status === "COMPLETED" || service.status === "SKIPPED" || service.status === "CANCELLED");
        if (!allServicesResolved) {
            throw new Error("All services must be completed, skipped, or cancelled");
        }
        const cleanProofUrls = proofUrls.filter((url) => typeof url === "string").map((url) => url.trim()).filter(Boolean);
        if (!cleanProofUrls.length) {
            throw new Error("At least one completion proof is required");
        }
        const now = new Date();
        this.addMilestoneIfMissing(booking, "ALL_SERVICES_COMPLETED", completedBy);
        this.addMilestoneIfMissing(booking, "FINAL_REPORT_GENERATED", completedBy, notes?.trim());
        booking.execution.completion = { notes: notes?.trim() || "", proofUrls: cleanProofUrls, completedBy: new Types.ObjectId(completedBy), completedAt: now };
        booking.status = "COMPLETED";
        booking.completedAt = now;
        booking.execution.stage = "FINISHED";
        booking.execution.finishedAt = now;
        booking.execution.progressPercentage = 100;
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                await booking.save({ session });
                await User.updateOne({ _id: assignedCoordinatorId }, { $inc: { "coordinatorProfile.totalCompletedBookings": 1 } }, { session });
                if (booking.userId) {
                    await OutboxService.createEvent({
                        eventId: `BOOKING.COMPLETED:${booking._id.toString()}`,
                        eventType: DOMAIN_EVENTS.BOOKING_COMPLETED,
                        aggregateType: "BOOKING",
                        aggregateId: booking._id.toString(),
                        payload: { bookingId: booking._id.toString(), bookingReference: booking.bookingReference, userId: booking.userId.toString(), completedAt: now },
                        session,
                    });
                }
            });
        }
        finally {
            await session.endSession();
        }
        await ChatConversationService.closeForBooking({ bookingId: booking._id.toString() });
        await this.invalidateBookingCache(bookingId);
        return {
            bookingId: booking._id,
            bookingReference: booking.bookingReference,
            bookingStatus: booking.status,
            executionStage: booking.execution.stage,
            progressPercentage: booking.execution.progressPercentage,
            completion: booking.execution.completion,
            completedAt: booking.completedAt,
        };
    }
    static async generateBookingOtp(params) {
        const { bookingId, coordinatorId } = params;
        const booking = await Booking.findOne({ _id: bookingId, isDeleted: false }).select("+execution.otpVerification.otpHash");
        if (!booking) {
            throw new Error("Booking not found");
        }
        if (booking.status !== "IN_PROGRESS") {
            throw new Error("OTP can be generated only after coordinator arrival");
        }
        if (booking.assignment?.assignedCoordinatorId?.toString() !== coordinatorId) {
            throw new Error("Only the assigned coordinator can request booking OTP");
        }
        booking.execution ??= { stage: "CUSTOMER_VERIFICATION_PENDING", serviceExecutions: [], milestones: [], progressPercentage: 0 };
        const now = new Date();
        const previousOtp = booking.execution.otpVerification;
        if (previousOtp?.status === "VERIFIED") {
            throw new Error("Booking OTP has already been verified");
        }
        if (previousOtp?.lastSentAt && now.getTime() - previousOtp.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
            const remainingSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now.getTime() - previousOtp.lastSentAt.getTime())) / 1000);
            throw new Error(`Please wait ${remainingSeconds} seconds before requesting another OTP`);
        }
        const resendCount = previousOtp?.resendCount ?? 0;
        if (resendCount >= MAX_OTP_RESENDS) {
            throw new Error("Maximum OTP resend limit reached");
        }
        const otp = this.generateOtp();
        const otpHash = await bcrypt.hash(otp, 10);
        booking.execution.otpVerification = { status: "PENDING", otpHash, generatedAt: now, expiresAt: new Date(now.getTime() + BOOKING_OTP_EXPIRY_MS), attempts: 0, resendCount: resendCount + 1, lastSentAt: now };
        booking.execution.stage = "CUSTOMER_VERIFICATION_PENDING";
        await booking.save();
        // Send through SMS, WhatsApp, or email.
        // await NotificationService.sendBookingOtp({
        //   phone: booking.customerDetails.phone,
        //   email: booking.customerDetails.email,
        //   otp,
        //   bookingReference: booking.bookingReference,
        // });
        return {
            bookingId: booking._id,
            bookingReference: booking.bookingReference,
            expiresAt: booking.execution.otpVerification.expiresAt,
            resendAvailableAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS),
            resendCount: booking.execution.otpVerification.resendCount,
            remainingResends: MAX_OTP_RESENDS - (booking.execution.otpVerification.resendCount ?? 0),
            otp,
            // ...(process.env.NODE_ENV !== "production" && {
            //   otp,
            // }),
        };
    }
    static async getBookingInvoice(params) {
        const { bookingId, requestedBy, requestedByRole } = params;
        if (!Types.ObjectId.isValid(bookingId)) {
            throw new Error("Invalid booking ID");
        }
        const booking = await Booking.findOne({ _id: bookingId, isDeleted: false }).select({
            userId: 1,
            bookingReference: 1,
            status: 1,
            bookedBy: 1,
            bookingFor: 1,
            customerDetails: 1,
            entries: 1,
            pricing: 1,
            payment: 1,
            scheduledAt: 1,
            completedAt: 1,
            createdAt: 1,
        }).lean();
        if (!booking) {
            throw new Error("Booking not found");
        }
        // Authorization
        if (requestedByRole === Role.USER) {
            const isOwner = booking.userId?.toString() === requestedBy;
            if (!isOwner) {
                throw new Error("You are not authorized to view this invoice");
            }
        }
        else if (requestedByRole !== Role.ADMIN) {
            throw new Error("You are not authorized to view this invoice");
        }
        //  Invoice should exist only for payments that were successfully completed. PARTIAL_REFUND / REFUNDED are also allowed because the original invoice remains valid after refund. /
        const invoicePaymentStatuses = ["PAID", "PARTIAL_REFUND", "REFUNDED"];
        if (!invoicePaymentStatuses.includes(booking.payment.status)) {
            throw new Error("Invoice is not available until payment is completed");
        }
        // Do NOT expose pricing.earnings. earnings is internal platform/business information and should not appear on the customer invoice.
        const pricing = {
            baseAmount: booking.pricing.baseAmount,
            addonAmount: booking.pricing.addonAmount ?? 0,
            subtotal: booking.pricing.subtotal,
            couponCode: booking.pricing.couponCode ?? null,
            discountAmount: booking.pricing.discountAmount ?? 0,
            taxSummary: booking.pricing.taxSummary,
            grandTotal: booking.pricing.grandTotal,
        };
        // Only expose payment information useful for invoice / transaction display.
        const payment = {
            status: booking.payment.status,
            paymentMethod: booking.payment.paymentMethod ?? null,
            gateway: booking.payment.gateway ?? null,
            amountPaid: booking.payment.amountPaid ?? 0,
            refundAmount: booking.payment.refundAmount ?? 0,
            currency: booking.payment.currency ?? "INR",
            paidAt: booking.payment.paidAt ?? null,
            refundedAt: booking.payment.refundedAt ?? null,
            providerOrderId: booking.payment.providerOrderId ?? null,
            providerPaymentId: booking.payment.providerPaymentId ?? null,
        };
        return {
            bookingId: booking._id,
            bookingReference: booking.bookingReference,
            bookingStatus: booking.status,
            bookedAt: booking.createdAt,
            scheduledAt: booking.scheduledAt ?? null,
            completedAt: booking.completedAt ?? null,
            bookingFor: booking.bookingFor,
            customer: {
                name: booking.customerDetails?.name ?? null,
                email: booking.customerDetails?.email ?? null,
                phone: booking.customerDetails?.phone ?? null,
                address: booking.customerDetails?.address ?? null,
            },
            items: booking.entries,
            pricing,
            payment,
        };
    }
    static async createBeneficiaryAccess(bookingId) {
        if (!Types.ObjectId.isValid(bookingId)) {
            throw new Error("Invalid booking ID");
        }
        const booking = await Booking.findOne({ _id: bookingId, isDeleted: false }).select("+beneficiaryAccess.tokenHash");
        if (!booking) {
            throw new Error("Booking not found");
        }
        if (booking.bookingFor !== "OTHER") {
            return null;
        }
        const email = booking.customerDetails?.email?.trim().toLowerCase();
        const phone = booking.customerDetails?.phone?.trim();
        if (!email && !phone) {
            throw new Error("Email or phone is required for OTHER booking");
        }
        // Try to link the booking with an existing USER account.
        const identityConditions = [];
        if (email) {
            identityConditions.push({ email });
        }
        if (phone) {
            identityConditions.push({ phoneNumber: phone });
        }
        const existingUser = await User.findOne({ role: Role.USER, $or: identityConditions }).select("_id").lean();
        if (existingUser) {
            booking.beneficiaryUserId = existingUser._id;
        }
        const now = new Date();
        // Don't generate another token while the existing browser-access link is still active.
        const hasActiveToken = !!booking.beneficiaryAccess?.tokenHash && !!booking.beneficiaryAccess?.expiresAt && booking.beneficiaryAccess.expiresAt > now;
        if (hasActiveToken) {
            // Save beneficiaryUserId in case the account became available after the original link was generated.
            await booking.save();
            return {
                bookingId: booking._id,
                bookingReference: booking.bookingReference,
                token: null,
                tokenCreated: false,
                beneficiaryUserId: booking.beneficiaryUserId ?? null,
                expiresAt: booking.beneficiaryAccess?.expiresAt ?? null,
            };
        }
        // No active access token exists. Create a new browser-access link.
        const { token, tokenHash } = this.generateBeneficiaryAccessToken();
        booking.beneficiaryAccess = { tokenHash, createdAt: now, expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) };
        await booking.save();
        await this.invalidateBookingCache(bookingId);
        return {
            bookingId: booking._id,
            bookingReference: booking.bookingReference,
            token,
            tokenCreated: true,
            beneficiaryUserId: booking.beneficiaryUserId ?? null,
            expiresAt: booking.beneficiaryAccess.expiresAt,
        };
    }
    static async getBeneficiaryBooking(token) {
        if (!token?.trim()) {
            throw new Error("Booking access token is required");
        }
        const tokenHash = this.hashBeneficiaryAccessToken(token.trim());
        const booking = await Booking.findOne({ bookingFor: "OTHER", isDeleted: false, "beneficiaryAccess.tokenHash": tokenHash, "beneficiaryAccess.expiresAt": { $gt: new Date() } }).select("+beneficiaryAccess.tokenHash").lean();
        if (!booking) {
            throw new Error("Booking link is invalid or expired");
        }
        // Return only what beneficiary should see. Do NOT expose payment gateway internals, purchaser userId, admin notes, etc.
        return {
            bookingId: booking._id,
            bookingReference: booking.bookingReference,
            status: booking.status,
            customerDetails: booking.customerDetails,
            entries: booking.entries,
            scheduledAt: booking.scheduledAt ?? null,
            assignment: { status: booking.assignment?.status, assignedCoordinatorId: booking.assignment?.assignedCoordinatorId ?? null },
            execution: booking.execution ?? null,
            createdAt: booking.createdAt,
            completedAt: booking.completedAt ?? null,
        };
    }
    static async linkBeneficiaryBookingsToUser(userId) {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }
        const user = await User.findOne({ _id: userId, role: Role.USER }).select("_id email phoneNumber").lean();
        if (!user) {
            throw new Error("User not found");
        }
        const email = user.email?.trim().toLowerCase();
        const phone = user.phoneNumber?.trim();
        const identityConditions = [];
        if (email) {
            identityConditions.push({ "customerDetails.email": email });
        }
        if (phone) {
            identityConditions.push({ "customerDetails.phone": phone });
        }
        if (identityConditions.length === 0) {
            return { linkedCount: 0 };
        }
        const result = await Booking.updateMany({
            bookingFor: "OTHER",
            isDeleted: false,
            $and: [
                { $or: identityConditions },
                {
                    $or: [
                        { beneficiaryUserId: { $exists: false } },
                        { beneficiaryUserId: null },
                        { beneficiaryUserId: user._id },
                    ],
                },
            ],
        }, { $set: { beneficiaryUserId: user._id } });
        if (result.modifiedCount > 0) {
            await this.invalidateBookingCache();
        }
        return { linkedCount: result.modifiedCount };
    }
    static async processAutoAssignments() {
        const now = new Date();
        const bookings = await Booking.find({
            isDeleted: false,
            "payment.status": "PAID",
            $or: [
                // NORMAL INITIAL / RESCHEDULE RETRY ASSIGNMENT
                {
                    status: { $in: ["CONFIRMED", "ASSIGNMENT_PENDING"] },
                    $or: [
                        { "assignment.status": "PENDING_SELECTION", "assignment.assignmentExpiresAt": { $lte: now }, "assignment.requests": { $size: 0 } },
                        { "assignment.status": "PENDING_SELECTION", "assignment.requests.0": { $exists: true } },
                    ],
                },
                // SAFE USER/AUTO REASSIGNMENT FALLBACK Current coordinator remains assigned.
                { status: "ASSIGNED", "assignment.status": "ACCEPTED", "assignment.reassignment.status": "PENDING_REPLACEMENT", "assignment.reassignment.mode": "AUTO" },
            ],
        });
        const result = { processed: 0, assigned: 0, reassignmentRequests: 0, reassignmentFailed: 0, waitingForUserSelection: 0, noCoordinatorAvailable: 0, skipped: 0 };
        for (const booking of bookings) {
            try {
                if (!booking.assignment) {
                    result.skipped += 1;
                    continue;
                }
                const reassignment = booking.assignment.reassignment;
                const isAutoReassignment = booking.status === "ASSIGNED" && reassignment?.status === "PENDING_REPLACEMENT" && reassignment?.mode === "AUTO";
                // USER REASSIGNMENT -> AUTOMATIC FALLBACK Manual phase: user can send up to 3 requests in parallel. Fallback starts only when: - all 3 manual slots have been used and none accepted, OR - the user-selection window has expired. Automatic fallback requests are then sent one at a time.
                if (isAutoReassignment) {
                    const currentRound = booking.assignment.currentRound ?? 1;
                    const currentRoundRequests = (booking.assignment.requests ?? []).filter((request) => (request.assignmentRound ?? 1) === currentRound);
                    const manualRequests = currentRoundRequests.filter((request) => request.assignmentType === "MANUAL");
                    const autoRequests = currentRoundRequests.filter((request) => request.assignmentType === "AUTO");
                    const selectionExpiresAt = new Date(new Date(reassignment.requestedAt).getTime() + ASSIGNMENT_WINDOW_MS);
                    const selectionExpired = selectionExpiresAt <= now;
                    const manualRequestLimit = this.getReassignmentManualRequestLimit(reassignment.requestedByRole);
                    // USER should still be allowed to send more manual requests. Do not start fallback early unless all 3 manual request slots have already been used.
                    if (["USER", "COORDINATOR"].includes(reassignment.requestedByRole) && manualRequests.length < manualRequestLimit && !selectionExpired) {
                        result.waitingForUserSelection += 1;
                        continue;
                    }
                    // Automatic fallback is also capped. If every fallback coordinator rejected/expired, original coordinator remains responsible and reassignment fails safely.
                    if (autoRequests.length >= MAX_REASSIGNMENT_AUTO_ATTEMPTS) {
                        reassignment.status = "FAILED";
                        reassignment.failedAt = now;
                        reassignment.failureReason = "Maximum automatic replacement attempts reached";
                        booking.status = "ASSIGNED";
                        booking.assignment.status = "ACCEPTED";
                        await booking.save();
                        await this.invalidateBookingCache(booking._id.toString());
                        result.reassignmentFailed += 1;
                        continue;
                    }
                    if (!booking.scheduledAt) {
                        reassignment.status = "FAILED";
                        reassignment.failedAt = now;
                        reassignment.failureReason = "Booking schedule is missing";
                        await booking.save();
                        result.reassignmentFailed += 1;
                        continue;
                    }
                    // Exclude: - currently responsible coordinator A - all manually requested coordinators - all earlier automatic fallback coordinators
                    const excludedCoordinatorIds = [];
                    const currentCoordinatorId = booking.assignment.assignedCoordinatorId;
                    if (currentCoordinatorId) {
                        excludedCoordinatorIds.push(new Types.ObjectId(currentCoordinatorId.toString()));
                    }
                    for (const request of currentRoundRequests) {
                        const id = new Types.ObjectId(request.coordinatorId.toString());
                        if (!excludedCoordinatorIds.some((excludedId) => excludedId.toString() === id.toString())) {
                            excludedCoordinatorIds.push(id);
                        }
                    }
                    const coordinator = await this.findNextAvailableCoordinator(booking, excludedCoordinatorIds, booking.scheduledAt);
                    result.processed += 1;
                    // No coordinator qualifies RIGHT NOW. Keep current coordinator A responsible and retry on next cron.
                    if (!coordinator) {
                        result.noCoordinatorAvailable += 1;
                        if (booking.scheduledAt <= now) {
                            reassignment.status = "FAILED";
                            reassignment.failedAt = now;
                            reassignment.failureReason = "No replacement coordinator became available before the scheduled booking time";
                            await booking.save();
                            await this.invalidateBookingCache(booking._id.toString());
                            result.reassignmentFailed += 1;
                        }
                        continue;
                    }
                    await this.assignReplacementCoordinatorRequest({ booking, coordinatorId: coordinator._id, requestedBy: reassignment.requestedBy, assignmentType: "AUTO" });
                    result.reassignmentRequests += 1;
                    continue;
                }
                // NORMAL / RESCHEDULE AUTO ASSIGNMENT
                const currentRound = booking.assignment.currentRound ?? 1;
                const pendingReschedule = booking.assignment.pendingReschedule;
                const targetScheduledAt = pendingReschedule?.requestedScheduledAt ?? booking.scheduledAt;
                if (!targetScheduledAt) {
                    result.skipped += 1;
                    continue;
                }
                const currentRoundRequests = (booking.assignment.requests ?? []).filter((request) => (request.assignmentRound ?? 1) === currentRound);
                // RESCHEDULE manual-selection phase. Let the user send up to 3 manual requests in parallel before automatic fallback starts. If they send fewer, fallback starts after the same selection window.
                if (pendingReschedule && pendingReschedule.assignmentRound === currentRound) {
                    const manualRequests = currentRoundRequests.filter((request) => request.assignmentType === "MANUAL");
                    const selectionExpiresAt = new Date(pendingReschedule.requestedAt.getTime() + ASSIGNMENT_WINDOW_MS);
                    const selectionExpired = selectionExpiresAt <= now;
                    if (manualRequests.length < MAX_RESCHEDULE_USER_REQUESTS && !selectionExpired) {
                        result.waitingForUserSelection += 1;
                        continue;
                    }
                }
                const excludedCoordinatorIds = currentRoundRequests.map((request) => new Types.ObjectId(request.coordinatorId.toString()));
                const coordinator = await this.findNextAvailableCoordinator(booking, excludedCoordinatorIds, targetScheduledAt);
                result.processed += 1;
                if (!coordinator) {
                    result.noCoordinatorAvailable += 1;
                    continue;
                }
                await this.assignCoordinatorRequest({ booking, coordinatorId: coordinator._id, assignmentType: "AUTO", scheduledAt: targetScheduledAt });
                result.assigned += 1;
            }
            catch (error) {
                console.error(`[AUTO ASSIGN] Booking ${booking._id} failed:`, error);
            }
        }
        return result;
    }
    static async exportBookingsToCsv(bookingIds) {
        if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
            throw new HttpError(400, "At least one booking ID is required");
        }
        const uniqueBookingIds = [...new Set(bookingIds.map((bookingId) => bookingId.trim()))];
        // Defensive service-level validation. Route already validates these, but the service should remain safe if used elsewhere.
        for (const bookingId of uniqueBookingIds) {
            if (!Types.ObjectId.isValid(bookingId)) {
                throw new HttpError(400, `Invalid booking ID: ${bookingId}`);
            }
        }
        const bookings = await Booking.find({
            _id: { $in: uniqueBookingIds.map((bookingId) => new Types.ObjectId(bookingId)) }, isDelted: false,
        }).select([
            "bookingReference",
            "bookedBy",
            "bookingFor",
            "customerDetails",
            "entries",
            "pricing",
            "payment",
            "status",
            "assignment.status",
            "assignment.assignedCoordinatorId",
            "assignment.assignmentType",
            "assignment.assignedAt",
            "scheduledAt",
            "completedAt",
            "cancellation",
            "notes",
            "createdAt",
            "updatedAt",
        ].join(" ")).populate({ path: "assignment.assignedCoordinatorId", select: "fullName email phoneNumber userReference" }).lean();
        if (bookings.length === 0) {
            throw new HttpError(404, "No bookings found for export");
        }
        const escapeCsv = (value) => {
            if (value === null || value === undefined) {
                return "";
            }
            const stringValue = String(value);
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n") || stringValue.includes("\r")) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };
        const formatDate = (value) => {
            if (!value) {
                return "";
            }
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return "";
            }
            return date.toISOString();
        };
        // One Booking can contain either SERVICE or PACKAGE entries. We convert snapshots into readable names instead of exporting ObjectIds.
        const getEntryDetails = (entries) => {
            const entryTypes = [];
            const itemNames = [];
            const tiers = [];
            const locations = [];
            for (const entry of entries ?? []) {
                if (entry.entryType === "SERVICE" && entry.serviceConfiguration) {
                    const configuration = entry.serviceConfiguration;
                    entryTypes.push("SERVICE");
                    if (configuration.serviceSnapshot?.name) {
                        itemNames.push(configuration.serviceSnapshot.name);
                    }
                    if (configuration.tier?.name) {
                        tiers.push(configuration.tier.name);
                    }
                    if (configuration.location?.name) {
                        locations.push(configuration.location.name);
                    }
                    continue;
                }
                if (entry.entryType === "PACKAGE" && entry.packageConfiguration) {
                    const configuration = entry.packageConfiguration;
                    entryTypes.push("PACKAGE");
                    if (configuration.packageSnapshot?.name) {
                        itemNames.push(configuration.packageSnapshot.name);
                    }
                    // Package can contain many selected/addon services.
                    const packageServices = [
                        ...(configuration.selectedServices ?? []),
                        ...(configuration.addonServices ?? []),
                    ];
                    for (const service of packageServices) {
                        if (service.tier?.name) {
                            tiers.push(service.tier.name);
                        }
                        if (service.location?.name) {
                            locations.push(service.location.name);
                        }
                    }
                }
            }
            return {
                entryTypes: [...new Set(entryTypes)].join(" | "),
                itemNames: [...new Set(itemNames)].join(" | "),
                tiers: [...new Set(tiers)].join(" | "),
                locations: [...new Set(locations)].join(" | "),
            };
        };
        const headers = [
            "Booking Reference",
            "Booking Status",
            "Booked By",
            "Booking For",
            "Customer Name",
            "Customer Email",
            "Customer Phone",
            "Customer Address",
            "Caste",
            "Gotra",
            "Entry Type",
            "Service / Package",
            "Tier",
            "Location",
            "Base Amount",
            "Addon Amount",
            "Subtotal",
            "Coupon Code",
            "Discount Amount",
            "Taxable Amount",
            "CGST Amount",
            "SGST Amount",
            "IGST Amount",
            "Total Tax",
            "Grand Total",
            "Payment Status",
            "Payment Method",
            "Payment Gateway",
            "Amount Paid",
            "Currency",
            "Provider Order ID",
            "Provider Payment ID",
            "Paid At",
            "Refund Amount",
            "Refunded At",
            "Assignment Status",
            "Coordinator Name",
            "Coordinator Reference",
            "Assignment Type",
            "Assigned At",
            "Scheduled At",
            "Completed At",
            "Cancellation Reason",
            "Cancelled By Role",
            "Cancelled At",
            "Cancellation Refund Amount",
            "Notes",
            "Created At",
            "Updated At",
        ];
        const rows = bookings.map((booking) => {
            const entryDetails = getEntryDetails(booking.entries ?? []);
            const coordinator = booking.assignment?.assignedCoordinatorId && typeof booking.assignment.assignedCoordinatorId === "object" ? booking.assignment.assignedCoordinatorId : null;
            const taxSummary = booking.pricing?.taxSummary ?? {};
            return [
                booking.bookingReference,
                booking.status,
                booking.bookedBy,
                booking.bookingFor,
                booking.customerDetails?.name,
                booking.customerDetails?.email,
                booking.customerDetails?.phone,
                booking.customerDetails?.address,
                booking.customerDetails?.caste,
                booking.customerDetails?.gotra,
                entryDetails.entryTypes,
                entryDetails.itemNames,
                entryDetails.tiers,
                entryDetails.locations,
                booking.pricing?.baseAmount,
                booking.pricing?.addonAmount,
                booking.pricing?.subtotal,
                booking.pricing?.couponCode,
                booking.pricing?.discountAmount,
                taxSummary.taxableAmount,
                taxSummary.cgstAmount,
                taxSummary.sgstAmount,
                taxSummary.igstAmount,
                taxSummary.totalTax,
                booking.pricing?.grandTotal,
                booking.payment?.status,
                booking.payment?.paymentMethod,
                booking.payment?.gateway,
                booking.payment?.amountPaid,
                booking.payment?.currency,
                booking.payment?.providerOrderId,
                booking.payment?.providerPaymentId,
                formatDate(booking.payment?.paidAt),
                booking.payment?.refundAmount,
                formatDate(booking.payment?.refundedAt),
                booking.assignment?.status,
                coordinator?.fullName,
                coordinator?.userReference,
                booking.assignment?.assignmentType,
                formatDate(booking.assignment?.assignedAt),
                formatDate(booking.scheduledAt),
                formatDate(booking.completedAt),
                booking.cancellation?.reason,
                booking.cancellation?.cancelledByRole,
                formatDate(booking.cancellation?.cancelledAt),
                booking.cancellation?.refundAmount,
                booking.notes,
                formatDate(booking.createdAt),
                formatDate(booking.updatedAt),
            ];
        });
        const csv = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
        return { csv, total: bookings.length };
    }
}
//# sourceMappingURL=booking.service.js.map