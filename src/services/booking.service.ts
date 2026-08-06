import type { Request } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { CashfreeService } from "./cashfree.service.js";
import { Booking, type BookingCategory, type BookingMilestone, type BookingStatus, type IBookingReschedule, type ReassignmentRequestedByRole } from "../models/booking.model.js";
import mongoose, { Types } from "mongoose";
import { Cart } from "../models/cart.model.js";
import { Coupon } from "../models/coupon.model.js";
import { ReferralRewardService } from "./referralreward.service.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { User } from "../models/user.model.js";

const COORDINATOR_RESPONSE_TIME_MS = 2 * 60 * 60 * 1000;  // for testing only
// const COORDINATOR_RESPONSE_TIME_MS = 10 * 60 * 1000;
const ASSIGNMENT_WINDOW_MS = 2 * 60 * 60 * 1000;

const BOOKING_OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_RESENDS = 5;
const MAX_OTP_VERIFICATION_ATTEMPTS = 5;

type AssignmentAction = "ACCEPT" | "REJECT";
export type CoordinatorBookingView = "REQUESTS" | "BOOKINGS";

const STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED", "EXPIRED"],
  CONFIRMED: ["ASSIGNMENT_PENDING", "CANCELLED"],
  ASSIGNMENT_PENDING: ["CONFIRMED", "ASSIGNED", "CANCELLED"],
  ASSIGNED: ["ASSIGNMENT_PENDING", "IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: ["PENDING_PAYMENT", "CANCELLED"],
};

export interface CoordinatorFilters {
  matchCaste?: boolean;
  matchGotra?: boolean;
  minRating?: number;
  minCompletedBookings?: number;
  autoAssignmentEnabled?: boolean;
  sortBy?: "rating" | "completedBookings" | "acceptanceRate";
  sortOrder?: "asc" | "desc";
  scheduledAt?: string;
}

export class BookingService {
  private static generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  private static buildServiceExecutions(booking: any) {
    const serviceExecutions: {
      executionId: string;
      serviceId: Types.ObjectId;
      status: "PENDING";
    }[] = [];

    for (const entry of booking.entries ?? []) {

      // DIRECT SERVICE
      if (
        entry.entryType === "SERVICE" &&
        entry.serviceConfiguration?.serviceId
      ) {
        serviceExecutions.push({
          executionId: crypto.randomUUID(),
          serviceId: new Types.ObjectId(
            entry.serviceConfiguration.serviceId.toString(),
          ),
          status: "PENDING",
        });
      }

      // PACKAGE
      if (
        entry.entryType === "PACKAGE" &&
        entry.packageConfiguration
      ) {
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
            serviceId: new Types.ObjectId(
              service.serviceId.toString(),
            ),
            status: "PENDING",
          });
        }
      }
    }

    return serviceExecutions;
  }

  private static async validateBookingOtp(
    booking: any,
    otp: string,
  ): Promise<boolean> {
    const otpVerification =
      booking.execution?.otpVerification;

    if (!otpVerification?.otpHash) {
      throw new Error(
        "Booking OTP has not been generated",
      );
    }

    if (!otpVerification.expiresAt) {
      throw new Error(
        "Booking OTP expiry is missing",
      );
    }

    if (
      otpVerification.status === "VERIFIED"
    ) {
      throw new Error(
        "Booking OTP has already been verified",
      );
    }

    if (
      otpVerification.attempts >=
      MAX_OTP_VERIFICATION_ATTEMPTS
    ) {
      throw new Error(
        "Maximum OTP verification attempts exceeded",
      );
    }

    if (
      otpVerification.expiresAt <= new Date()
    ) {
      otpVerification.status = "EXPIRED";

      await booking.save();

      throw new Error(
        "Booking OTP has expired",
      );
    }

    return bcrypt.compare(
      otp,
      otpVerification.otpHash,
    );
  }

  private static getBookingLocationIds(booking: any): Types.ObjectId[] {
    const locationIds = new Set<string>();

    for (const entry of booking.entries ?? []) {
      if (
        entry.entryType === "SERVICE" &&
        entry.serviceConfiguration?.location?.locationId
      ) {
        locationIds.add(
          entry.serviceConfiguration.location.locationId.toString(),
        );
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

    return Array.from(locationIds).map(
      (locationId) => new Types.ObjectId(locationId),
    );
  }

  private static getRequestedCoordinatorIds(
    booking: any,
    scheduledAt?: Date,
    assignmentRound?: number,
  ): Types.ObjectId[] {
    if (!scheduledAt) {
      return [];
    }

    const requests = booking.assignment?.requests ?? [];
    const currentRound =
      assignmentRound ?? booking.assignment?.currentRound ?? 1;

    const targetDate = new Date(scheduledAt);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return requests
      .filter(
        (request: any) =>
          (request.assignmentRound ?? 1) === currentRound &&
          request.scheduledAt &&
          request.scheduledAt >= startOfDay &&
          request.scheduledAt <= endOfDay,
      )
      .map((request: any) => request.coordinatorId)
      .filter(Boolean)
      .map(
        (coordinatorId: Types.ObjectId | string) =>
          new Types.ObjectId(coordinatorId.toString()),
      );
  }

  private static async findNextAvailableCoordinator(
    booking: any,
    excludedCoordinatorIds: Types.ObjectId[] = [],
  ) {
    const locationIds = this.getBookingLocationIds(booking);

    const query: Record<string, any> = {
      role: "COORDINATOR",
      isActive: true,
      isDocumentVerified: true,
      "coordinatorProfile.approvalStatus": "APPROVED",
      "coordinatorProfile.availabilityStatus": "AVAILABLE",
      "coordinatorProfile.autoAssignmentEnabled": true,
    };

    if (locationIds.length > 0) {
      query[
        "coordinatorProfile.serviceableLocations.locationId"
      ] = {
        $in: locationIds,
      };
    }

    if (excludedCoordinatorIds.length > 0) {
      query._id = {
        $nin: excludedCoordinatorIds,
      };
    }

    const candidates = await User.find(query)
      .sort({
        "coordinatorProfile.averageRating": -1,
        "coordinatorProfile.totalAssignedBookings": 1,
      })
      .limit(20)
      .lean();

    if (!candidates.length) {
      return null;
    }

    if (!booking.scheduledAt) {
      return candidates[0];
    }

    const scheduledDate = new Date(booking.scheduledAt);

    const startOfDay = new Date(scheduledDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(scheduledDate);
    endOfDay.setHours(23, 59, 59, 999);

    for (const coordinator of candidates) {
      const assignedBookings = await Booking.countDocuments({
        isDeleted: false,
        "assignment.assignedCoordinatorId": coordinator._id,
        scheduledAt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        status: {
          $in: ["ASSIGNED", "IN_PROGRESS"],
        },
      });

      const maximumBookings =
        coordinator.coordinatorProfile?.maxDailyBookings ?? 5;

      if (assignedBookings < maximumBookings) {
        return coordinator;
      }
    }

    return null;
  }

  private static async assignCoordinatorRequest(params: {
    booking: any;
    coordinatorId: string | Types.ObjectId;
    selectedBy?: string | Types.ObjectId;
    assignmentType: "MANUAL" | "AUTO";
    scheduledAt?: Date;
  }) {
    const {
      booking,
      coordinatorId,
      selectedBy,
      assignmentType,
      scheduledAt,
    } = params;

    const now = new Date();
    const responseDeadlineAt = new Date(
      now.getTime() + COORDINATOR_RESPONSE_TIME_MS,
    );

    booking.assignment ??= {
      status: "NOT_STARTED",
      currentRound: 1,
      requests: [],
    };

    booking.assignment.requests ??= [];
    booking.assignment.currentRound ??= 1;

    const targetScheduledAt = scheduledAt ?? booking.scheduledAt;

    if (!targetScheduledAt) {
      throw new Error("Booking schedule is required");
    }

    const coordinatorObjectId = new Types.ObjectId(
      coordinatorId.toString(),
    );

    const duplicateRequest = booking.assignment.requests.find(
      (request: any) =>
        request.coordinatorId?.toString() ===
        coordinatorObjectId.toString() &&
        (request.assignmentRound ?? 1) ===
        booking.assignment.currentRound,
    );

    if (duplicateRequest) {
      throw new Error(
        "This coordinator has already received this booking request in the current assignment round",
      );
    }

    booking.assignment.requests.push({
      coordinatorId: coordinatorObjectId,
      status: "PENDING",
      assignmentRound: booking.assignment.currentRound,
      assignmentType,
      requestedBy: selectedBy
        ? new Types.ObjectId(selectedBy.toString())
        : undefined,
      requestedAt: now,
      responseDeadlineAt,
      scheduledAt: targetScheduledAt,
    });

    booking.assignment.status = "PENDING_RESPONSE";
    booking.assignment.assignmentType = assignmentType;
    booking.assignment.assignedBy = selectedBy
      ? new Types.ObjectId(selectedBy.toString())
      : undefined;

    // A coordinator becomes assigned only after accepting.
    delete booking.assignment.assignedCoordinatorId;
    delete booking.assignment.assignedAt;
    delete booking.assignment.coordinatorAcceptedAt;
    delete booking.assignment.responseDeadlineAt;

    booking.assignment.assignmentExpiresAt ??= new Date(
      now.getTime() + ASSIGNMENT_WINDOW_MS,
    );

    booking.status = "ASSIGNMENT_PENDING";
    await booking.save();

    return booking;
  }

  private static calculateExecutionProgress(
    serviceExecutions: any[],
  ): number {
    if (!serviceExecutions.length) {
      return 0;
    }

    const resolvedServices = serviceExecutions.filter(
      (service) =>
        service.status === "COMPLETED" ||
        service.status === "SKIPPED" ||
        service.status === "CANCELLED",
    ).length;

    return Math.round(
      (resolvedServices / serviceExecutions.length) * 100,
    );
  }

  private static addMilestoneIfMissing(
    booking: any,
    code: BookingMilestone,
    completedBy?: string | Types.ObjectId,
    notes?: string,
  ) {
    booking.execution ??= {
      stage: "NOT_STARTED",
      serviceExecutions: [],
      milestones: [],
      progressPercentage: 0,
    };

    booking.execution.milestones ??= [];

    const alreadyExists = booking.execution.milestones.some(
      (milestone: any) => milestone.code === code,
    );

    if (alreadyExists) {
      return;
    }

    booking.execution.milestones.push({
      code,
      completedAt: new Date(),
      completedBy: completedBy
        ? new Types.ObjectId(completedBy.toString())
        : undefined,
      notes,
    });
  }

  static async process(req: Request) {
    const rawBody = (req.body as Buffer).toString("utf-8");
    const signature = req.header("x-webhook-signature") || "";
    const timestamp = req.header("x-webhook-timestamp") || "";
    const valid = CashfreeService.verifyWebhookSignature(
      rawBody,
      signature,
      timestamp,
    );

    if (!valid) {
      const error = new Error("Invalid webhook signature") as Error & {
        statusCode?: number;
      };
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

    const booking = await Booking.findOne({
      "payment.providerOrderId": orderId,
    });
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
          const numericPaymentAmount = Number(paymentAmount);

          if (
            !Number.isFinite(numericPaymentAmount) ||
            Math.abs(
              numericPaymentAmount - booking.pricing.grandTotal,
            ) > 0.01
          ) {
            throw new Error(
              "Payment amount does not match booking total",
            );
          }

          const paidAt = new Date();

          const paidUpdate = await Booking.updateOne(
            {
              _id: booking._id,
              "payment.status": { $ne: "PAID" },
            },
            {
              $set: {
                "payment.status": "PAID",
                "payment.amountPaid": numericPaymentAmount,
                "payment.providerPaymentId": paymentId,
                "payment.gateway": "CASHFREE",
                "payment.paymentMethod": paymentGroup,
                "payment.paidAt": paidAt,
                status: "CONFIRMED",
                "assignment.status": "PENDING_SELECTION",
              },
              $unset: {
                paymentExpiresAt: 1,
                "payment.failureReason": 1,
              },
            },
            { session },
          );

          if (paidUpdate.modifiedCount === 0) {
            return;
          }

          await Cart.updateOne(
            { _id: booking.cartId },
            {
              $set: {
                status: "CHECKED_OUT",
                checkedOutAt: paidAt,
              },
              $unset: {
                checkoutExpiresAt: 1,
              },
            },
            { session },
          );

          if (booking.pricing.couponId) {
            await Coupon.updateOne(
              {
                _id: booking.pricing.couponId,
              },
              {
                $inc: {
                  usedCount: 1,
                },
              },
              { session },
            );
          }

          return;
        }

        if (paymentStatus === "FAILED") {
          await Booking.updateOne(
            { _id: booking._id },
            {
              $set: {
                "payment.status": "FAILED",
                "payment.failureReason": "Payment failed",
              },
            },
            { session },
          );
          return;
        }

        await Booking.updateOne(
          { _id: booking._id },
          { $set: { "payment.status": "PENDING" } },
          { session },
        );
      });

      if (paymentStatus === "SUCCESS" && booking.userId) {
        await ReferralRewardService.processReferralReward(
          booking.userId.toString(),
          booking._id.toString(),
        );
      }
    } catch (error: any) {
      throw error;
    } finally {
      await session.endSession();
    }
  }

  static async retryPayment(bookingId: string, userId: string) {
    if (
      !Types.ObjectId.isValid(bookingId) ||
      !Types.ObjectId.isValid(userId)
    ) {
      throw new Error("Invalid booking or user ID");
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      userId,
      isDeleted: false,
    });

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
      const order = await CashfreeService.getOrder(
        booking.payment.providerOrderId,
      );

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

    await Booking.updateOne(
      {
        _id: booking._id,
      },
      {
        $set: {
          status: "PENDING_PAYMENT",
          "payment.status": "PENDING",
          "payment.providerOrderId": order.order_id,
          "payment.paymentSessionId": order.payment_session_id,
          "payment.lastAttemptAt": new Date(),
          "assignment.status": "NOT_STARTED",
        },
        $unset: {
          "payment.failureReason": 1,
        },
        $inc: {
          "payment.attempts": 1,
        },
      },
    );
    return {
      orderId: order.order_id,
      paymentSessionId: order.payment_session_id,
    };
  }

  static async getPaymentStatus(cartId: string, userId: string) {
    if (
      !Types.ObjectId.isValid(cartId) ||
      !Types.ObjectId.isValid(userId)
    ) {
      throw new Error("Invalid cart or user ID");
    }

    const cart = await Cart.findOne({
      _id: cartId,
      userId,
    });

    if (!cart?.activeBookingId) {
      return {
        hasPendingPayment: false,
        paymentStatus: null,
        bookingStatus: null,
      };
    }

    const booking = await Booking.findOne({
      _id: cart.activeBookingId,
      userId,
      isDeleted: false,
    });

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
        const order = await CashfreeService.getOrder(
          booking.payment.providerOrderId,
        );

        cashfreeStatus = order.order_status;
      } catch (err) {
        console.error(err);
        cashfreeStatus = "UNKNOWN";
      }
    }

    const paidAt = new Date();

    // Sync DB if needed
    if (cashfreeStatus === "PAID" && booking.payment.status !== "PAID") {
      await Booking.updateOne(
        { _id: booking._id },
        {
          $set: {
            "payment.status": "PAID",
            status: "CONFIRMED",
            "assignment.status": "PENDING_SELECTION",
            "payment.paidAt": paidAt,
          },
          $unset: {
            paymentExpiresAt: 1,
            "payment.failureReason": 1,
          },
        },
      );

      booking.payment.status = "PAID";
      booking.status = "CONFIRMED";
      booking.payment.paidAt = paidAt;
    }

    const hasPending =
      cashfreeStatus === "ACTIVE" || cashfreeStatus === "PENDING";

    const canRetry =
      cashfreeStatus === "EXPIRED" ||
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

  static async findBookings(params: {
    searchTerm?: string;
    status?: string;
    paymentStatus?: string;
    userId?: string;
    bookingReference?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    includeCoordinatorProfile?: boolean;
  }) {
    const {
      searchTerm,
      status,
      paymentStatus,
      userId,
      bookingReference,
      fromDate,
      toDate,
      limit = 20,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "desc",
      includeCoordinatorProfile = false,
    } = params;

    const safePage =
      Number.isInteger(page) && page > 0 ? page : 1;

    const safeLimit =
      Number.isInteger(limit) && limit > 0
        ? Math.min(limit, 100)
        : 20;

    const skip = (safePage - 1) * safeLimit;

    const query: any = {
      isDeleted: false,
    };

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

      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate);
      }

      if (toDate) {
        query.createdAt.$lte = new Date(toDate);
      }
    }

    if (searchTerm?.trim()) {
      const term = escapeRegex(
        searchTerm.trim(),
      );

      query.$or = [
        {
          bookingReference: {
            $regex: term,
            $options: "i",
          },
        },
        {
          "customerDetails.name": {
            $regex: term,
            $options: "i",
          },
        },
        {
          "customerDetails.email": {
            $regex: term,
            $options: "i",
          },
        },
        {
          "customerDetails.phone": {
            $regex: term,
            $options: "i",
          },
        },
      ];
    }

    const allowedSortFields = new Set([
      "createdAt",
      "updatedAt",
      "scheduledAt",
      "status",
      "bookingReference",
      "pricing.grandTotal",
      "payment.status",
    ]);

    const safeSortBy =
      allowedSortFields.has(sortBy)
        ? sortBy
        : "createdAt";

    const sortCriteria: any = {};

    sortCriteria[safeSortBy] =
      sortOrder === "asc" ? 1 : -1;

    if (safeSortBy !== "createdAt") {
      sortCriteria.createdAt = -1;
    }

    let bookingQuery = Booking.find(query)
      .populate(
        "userId",
        "fullName email phoneNumber",
      )
      .populate(
        "cartId",
        "totalAmount status",
      );

    if (includeCoordinatorProfile) {
      bookingQuery = bookingQuery
        .populate({
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
        })
        .populate({
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

    try {
      const [data, total] =
        await Promise.all([
          bookingQuery
            .sort(sortCriteria)
            .skip(skip)
            .limit(safeLimit)
            .lean(),

          Booking.countDocuments(query),
        ]);

      const formattedData = data.map(
        (booking: any) => {
          const assignment =
            booking.assignment;

          const assignedCoordinator =
            assignment?.assignedCoordinatorId;

          const isAssignedCoordinatorPopulated =
            includeCoordinatorProfile &&
            assignedCoordinator &&
            typeof assignedCoordinator ===
            "object" &&
            "_id" in assignedCoordinator;

          const assignedCoordinatorId =
            isAssignedCoordinatorPopulated
              ? assignedCoordinator._id
              : assignedCoordinator ?? null;

          const coordinator =
            isAssignedCoordinatorPopulated
              ? {
                coordinatorId:
                  assignedCoordinator._id,

                fullName:
                  assignedCoordinator.fullName,

                profileImage:
                  assignedCoordinator.profileImage,

                phoneNumber:
                  assignedCoordinator.phoneNumber,

                gender:
                  assignedCoordinator.gender,

                userReference:
                  assignedCoordinator.userReference,

                caste:
                  assignedCoordinator.caste,

                gotra:
                  assignedCoordinator.gotra,

                rating: {
                  averageRating:
                    assignedCoordinator
                      .coordinatorProfile
                      ?.averageRating ?? 0,

                  totalRatings:
                    assignedCoordinator
                      .coordinatorProfile
                      ?.totalRatings ?? 0,
                },

                experience: {
                  totalCompletedBookings:
                    assignedCoordinator
                      .coordinatorProfile
                      ?.totalCompletedBookings ?? 0,
                },

                availabilityStatus:
                  assignedCoordinator
                    .coordinatorProfile
                    ?.availabilityStatus,
              }
              : null;

          const coordinatorRequests =
            assignment?.requests?.map(
              (request: any) => {
                const requestedCoordinator =
                  request.coordinatorId;

                const isRequestedCoordinatorPopulated =
                  includeCoordinatorProfile &&
                  requestedCoordinator &&
                  typeof requestedCoordinator ===
                  "object" &&
                  "_id" in requestedCoordinator;

                const requestedCoordinatorId =
                  isRequestedCoordinatorPopulated
                    ? requestedCoordinator._id
                    : requestedCoordinator ?? null;

                return {
                  requestId:
                    request._id,

                  coordinatorId:
                    requestedCoordinatorId,

                  status:
                    request.status,

                  assignmentType:
                    request.assignmentType,

                  requestedAt:
                    request.requestedAt,

                  responseDeadlineAt:
                    request.responseDeadlineAt,

                  respondedAt:
                    request.respondedAt,

                  rejectionReason:
                    request.rejectionReason,

                  coordinator:
                    isRequestedCoordinatorPopulated
                      ? {
                        coordinatorId:
                          requestedCoordinator._id,

                        fullName:
                          requestedCoordinator.fullName,

                        profileImage:
                          requestedCoordinator.profileImage,

                        phoneNumber:
                          requestedCoordinator.phoneNumber,

                        gender:
                          requestedCoordinator.gender,

                        userReference:
                          requestedCoordinator.userReference,

                        caste:
                          requestedCoordinator.caste,

                        gotra:
                          requestedCoordinator.gotra,

                        rating: {
                          averageRating:
                            requestedCoordinator
                              .coordinatorProfile
                              ?.averageRating ??
                            0,

                          totalRatings:
                            requestedCoordinator
                              .coordinatorProfile
                              ?.totalRatings ??
                            0,
                        },

                        experience: {
                          totalCompletedBookings:
                            requestedCoordinator
                              .coordinatorProfile
                              ?.totalCompletedBookings ??
                            0,
                        },

                        availabilityStatus:
                          requestedCoordinator
                            .coordinatorProfile
                            ?.availabilityStatus,
                      }
                      : null,
                };
              },
            ) ?? [];

          const {
            assignment: _assignment,
            ...bookingData
          } = booking;

          return {
            ...bookingData,

            assignment: assignment
              ? {
                ...assignment,

                assignedCoordinatorId,

                requests:
                  coordinatorRequests,
              }
              : null,

            coordinator:
              includeCoordinatorProfile
                ? coordinator
                : null,
          };
        },
      );

      return {
        data: formattedData,
        total,
        page: safePage,
        totalPages:
          Math.ceil(total / safeLimit),
      };
    } catch (error: any) {
      throw new Error(
        `Booking fetch failed: ${error.message}`,
      );
    }
  }

  static async getBookingById(bookingId: string) {
    if (!bookingId) {
      throw new Error("Booking ID is required");
    }

    const booking = await Booking.findById(bookingId)
      .populate("userId", "fullName email phoneNumber")
      .populate("assignment.assignedCoordinatorId", "fullName email phoneNumber")
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
      assignment: booking.assignment,
      cancellation: booking.cancellation,
      execution: booking.execution,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }

  static async getBookingStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [
        bookingStats,
        paymentStats,
        revenueStats,
        todayBookings,
        thisMonthBookings,
      ] = await Promise.all([
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

      const bookingMap = Object.fromEntries(
        bookingStats.map((item) => [item._id, item.count]),
      );

      const paymentMap = Object.fromEntries(
        paymentStats.map((item) => [item._id, item.count]),
      );

      return {
        totalBookings: Object.values(bookingMap).reduce(
          (sum: number, count: any) => sum + count,
          0,
        ),

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
    } catch (error: any) {
      throw new Error(`Booking stats fetch failed: ${error.message}`);
    }
  }

  static async searchBookings(searchQuery: string) {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return await Booking.find({
      isDeleted: false,
      $or: [
        { "customerDetails.email": normalizedQuery },
        { "customerDetails.phone": normalizedQuery },
        { "cartSnapshot.customerDetails.email": normalizedQuery },
        { "cartSnapshot.customerDetails.phone": normalizedQuery }
      ]
    }).populate("userId", "fullName email phoneNumber");
  }

  static async updateBookingNotes(
    bookingId: string,
    notes: string,
    userId: string,
  ) {
    if (!bookingId) {
      throw new Error("Booking ID is required");
    }

    if (typeof notes !== "string") {
      throw new Error("Notes must be a string");
    }

    if (
      !Types.ObjectId.isValid(bookingId) ||
      !Types.ObjectId.isValid(userId)
    ) {
      throw new Error("Invalid booking or user ID");
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      userId,
      isDeleted: false,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
      throw new Error(
        `Cannot update notes for ${booking.status.toLowerCase()} booking`,
      );
    }

    booking.notes = notes.trim();
    await booking.save();

    return {
      bookingId: booking._id,
      notes: booking.notes,
    };
  }

  static async rescheduleBooking(params: {
    bookingId: string;
    scheduledAt: string;
    reason: string;
    userId: string;
    role: string;
  }) {
    const {
      bookingId,
      scheduledAt,
      reason,
      userId,
      role,
    } = params;

    if (!bookingId) {
      throw new Error("Booking ID is required");
    }

    if (!scheduledAt) {
      throw new Error("New scheduled date is required");
    }

    if (!reason?.trim()) {
      throw new Error("Reschedule reason is required");
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      isDeleted: false,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    const isOwner =
      booking.userId?.toString() === userId;

    const isAdmin =
      role === "ADMIN" ||
      role === "SUBADMIN";

    if (!isOwner && !isAdmin) {
      throw new Error(
        "You are not authorized to reschedule this booking",
      );
    }

    if (
      ![
        "CONFIRMED",
        "ASSIGNMENT_PENDING",
        "ASSIGNED",
      ].includes(booking.status)
    ) {
      throw new Error(
        `Cannot reschedule booking with status ${booking.status}`,
      );
    }

    if (booking.payment.status !== "PAID") {
      throw new Error(
        "Only paid bookings can be rescheduled",
      );
    }

    if (
      booking.execution?.startedAt ||
      booking.status === "IN_PROGRESS"
    ) {
      throw new Error(
        "Booking cannot be rescheduled after execution has started",
      );
    }

    const newSchedule = new Date(scheduledAt);

    if (Number.isNaN(newSchedule.getTime())) {
      throw new Error(
        "Invalid scheduled date",
      );
    }

    const now = new Date();

    if (newSchedule <= now) {
      throw new Error(
        "Scheduled date must be in the future",
      );
    }

    if (
      booking.scheduledAt &&
      booking.scheduledAt.getTime() ===
      newSchedule.getTime()
    ) {
      throw new Error(
        "New scheduled date must be different from current schedule",
      );
    }

    const coordinatorId =
      booking.assignment?.assignedCoordinatorId;

    /*
     * If booking already has an accepted coordinator,
     * first check whether that coordinator can serve
     * the booking on the newly requested date.
     */
    if (
      booking.status === "ASSIGNED" &&
      coordinatorId
    ) {
      const coordinator =
        await User.findById(coordinatorId)
          .select({
            fullName: 1,
            profileImage: 1,
            userReference: 1,

            "coordinatorProfile.averageRating": 1,
            "coordinatorProfile.totalRatings": 1,
            "coordinatorProfile.totalCompletedBookings": 1,
            "coordinatorProfile.maxDailyBookings": 1,
          })
          .lean();

      if (!coordinator) {
        throw new Error(
          "Assigned coordinator not found",
        );
      }

      const startOfDay =
        new Date(newSchedule);

      startOfDay.setHours(
        0,
        0,
        0,
        0,
      );

      const endOfDay =
        new Date(newSchedule);

      endOfDay.setHours(
        23,
        59,
        59,
        999,
      );

      const assignedBookings =
        await Booking.countDocuments({
          _id: {
            $ne: booking._id,
          },

          isDeleted: false,

          "assignment.assignedCoordinatorId":
            coordinatorId,

          scheduledAt: {
            $gte: startOfDay,
            $lte: endOfDay,
          },

          status: {
            $in: [
              "ASSIGNED",
              "IN_PROGRESS",
            ],
          },
        });

      const maxDailyBookings =
        coordinator
          .coordinatorProfile
          ?.maxDailyBookings ?? 5;

      const coordinatorAvailable =
        assignedBookings < maxDailyBookings;

      /*
       * Existing coordinator is unavailable.
       *
       * IMPORTANT:
       * Do NOT change booking.scheduledAt yet.
       * Do NOT remove current coordinator yet.
       *
       * Frontend should now show other coordinators
       * available for requestedScheduledAt.
       */
      if (!coordinatorAvailable) {
        return {
          rescheduled: false,

          requiresCoordinatorChange: true,

          bookingId:
            booking._id,

          bookingReference:
            booking.bookingReference,

          bookingStatus:
            booking.status,

          currentScheduledAt:
            booking.scheduledAt,

          requestedScheduledAt:
            newSchedule,

          reason:
            reason.trim(),

          currentCoordinator: {
            coordinatorId:
              coordinator._id,

            fullName:
              coordinator.fullName,

            profileImage:
              coordinator.profileImage,

            userReference:
              coordinator.userReference,

            rating: {
              averageRating:
                coordinator
                  .coordinatorProfile
                  ?.averageRating ?? 0,

              totalRatings:
                coordinator
                  .coordinatorProfile
                  ?.totalRatings ?? 0,
            },

            experience: {
              totalCompletedBookings:
                coordinator
                  .coordinatorProfile
                  ?.totalCompletedBookings ?? 0,
            },
          },

          message:
            "Current coordinator is not available on the selected date. Please select another coordinator.",
        };
      }
    }

    /*
     * Existing coordinator is available
     * OR booking does not currently have
     * an assigned coordinator.
     *
     * Reschedule can be committed immediately.
     */
    const previousScheduledAt =
      booking.scheduledAt;

    booking.scheduledAt =
      newSchedule;

    booking.rescheduleHistory ??= [];

    const rescheduleEntry: IBookingReschedule = {
      newScheduledAt:
        newSchedule,

      reason:
        reason.trim(),

      rescheduledBy:
        new Types.ObjectId(userId),

      rescheduledByRole:
        role as
        | "USER"
        | "ADMIN"
        | "SUBADMIN",

      rescheduledAt:
        now,
    };

    if (previousScheduledAt) {
      rescheduleEntry.previousScheduledAt =
        previousScheduledAt;
    }

    booking.rescheduleHistory.push(
      rescheduleEntry,
    );

    await booking.save();

    return {
      rescheduled: true,

      requiresCoordinatorChange: false,

      bookingId:
        booking._id,

      bookingReference:
        booking.bookingReference,

      previousScheduledAt,

      scheduledAt:
        booking.scheduledAt,

      bookingStatus:
        booking.status,

      coordinatorId:
        booking.assignment
          ?.assignedCoordinatorId ?? null,

      rescheduledAt:
        now,

      message:
        coordinatorId
          ? "Booking rescheduled successfully. Existing coordinator is available on the selected date."
          : "Booking rescheduled successfully.",
    };
  }

  static async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    userId: string,
    role: string,
    reason?: string,
  ) {
    const booking = await Booking.findOne({
      _id: bookingId,
      isDeleted: false,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    const allowedTransitions = STATUS_TRANSITIONS[booking.status];

    if (!allowedTransitions.includes(status)) {
      throw new Error(
        `Cannot change booking from ${booking.status} to ${status}`,
      );
    }

    if (
      [
        "CONFIRMED",
        "ASSIGNMENT_PENDING",
        "ASSIGNED",
        "IN_PROGRESS",
        "COMPLETED",
      ].includes(status) &&
      booking.payment.status !== "PAID"
    ) {
      throw new Error(
        "Booking payment must be PAID before progressing",
      );
    }

    const now = new Date();
    const previousStatus = booking.status;

    const ensureAssignment = () => {
      if (!booking.assignment) {
        booking.assignment = {
          status: "NOT_STARTED",
          currentRound: 1,
          requests: [],
        };
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

        assignment.status =
          assignment.assignedCoordinatorId
            ? "PENDING_RESPONSE"
            : "PENDING_SELECTION";

        break;
      }

      case "ASSIGNED": {
        const assignment = ensureAssignment();

        if (!assignment.assignedCoordinatorId) {
          throw new Error(
            "Coordinator must be assigned before booking can be marked as ASSIGNED",
          );
        }

        booking.status = "ASSIGNED";
        assignment.status = "ACCEPTED";
        assignment.assignedAt ??= now;
        assignment.coordinatorAcceptedAt ??= now;

        break;
      }

      case "IN_PROGRESS": {
        const assignment = ensureAssignment();

        if (
          assignment.status !== "ACCEPTED" ||
          !assignment.assignedCoordinatorId
        ) {
          throw new Error(
            "Booking must have an accepted coordinator before starting",
          );
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
        } else {
          booking.execution.stage = "SERVICE_EXECUTION";
          booking.execution.startedAt ??= now;
        }

        break;
      }

      case "COMPLETED": {
        const serviceExecutions =
          booking.execution?.serviceExecutions ?? [];

        const allServicesCompleted =
          serviceExecutions.length > 0 &&
          serviceExecutions.every(
            (service) =>
              service.status === "COMPLETED" ||
              service.status === "SKIPPED" ||
              service.status === "CANCELLED",
          );

        if (!allServicesCompleted) {
          throw new Error(
            "All booking services must be resolved before completion",
          );
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
        } else {
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
          cancelledByRole:
            role as
            | "USER"
            | "ADMIN"
            | "SUBADMIN"
            | "SYSTEM",
          refundPercentage:
            booking.cancellation?.refundPercentage ?? 0,
          refundAmount:
            booking.cancellation?.refundAmount ?? 0,
        };

        break;
      }

      case "EXPIRED": {
        booking.status = "EXPIRED";
        booking.payment.status = "FAILED";
        booking.payment.failureReason =
          "Payment expired";

        break;
      }
    }

    await booking.save();

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

  static async refundBooking(
    bookingId: string,
    amount: number,
    reason: string,
    refundedBy?: string,
  ) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new Error("Invalid booking ID");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Refund amount must be greater than zero");
    }

    if (!reason?.trim()) {
      throw new Error("Refund reason is required");
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      isDeleted: false,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (
      booking.payment.status !== "PAID" &&
      booking.payment.status !== "PARTIAL_REFUND"
    ) {
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
      orderId: booking.payment.providerOrderId!,
      amount,
      refundId: refundReference,
      reason,
    });

    const totalRefunded = alreadyRefunded + amount;
    booking.payment.refundAmount = totalRefunded;
    booking.payment.refundedAt = new Date();
    booking.payment.refunds = booking.payment.refunds || [];

    booking.payment.refunds.push({
      refundId: refundReference,
      amount,
      reason,
      refundedAt: new Date(),
      providerRefundId: refundResponse.cf_refund_id || refundResponse.refund_id,
      status:
        refundResponse.refund_status === "SUCCESS" ? "SUCCESS" : "PENDING",
      refundedBy: refundedBy as any,
    });

    booking.payment.refundAmount = totalRefunded;
    if (totalRefunded >= booking.pricing.grandTotal) {
      booking.payment.status = "REFUNDED";
    } else {
      booking.payment.status = "PARTIAL_REFUND";
    }

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
        const expiredBookings = await Booking.find(
          {
            status: "PENDING_PAYMENT",
            "payment.status": { $in: ["PENDING", "PROCESSING"] },
            paymentExpiresAt: {
              $lte: now,
            },
          },
          {
            _id: 1,
            cartId: 1,
          },
        ).session(session);

        if (!expiredBookings.length) {
          return;
        }

        const bookingIds = expiredBookings.map((booking) => booking._id);

        const cartIds = expiredBookings
          .map((booking) => booking.cartId)
          .filter(Boolean);

        await Cart.updateMany(
          {
            _id: { $in: cartIds },
            status: {
              $in: ["CHECKED_OUT", "CHECKOUT_PENDING"],
            },
          },
          {
            $unset: {
              activeBookingId: 1,
            },
            $set: {
              status: "ACTIVE",
            },
          },
          { session },
        );

        const bookingUpdateResult = await Booking.updateMany(
          {
            _id: {
              $in: bookingIds,
            },
          },
          {
            $set: {
              status: "EXPIRED",
              "payment.status": "FAILED",
              "payment.failureReason": "Payment expired",
            },
            $unset: {
              paymentExpiresAt: 1,
            },
          },
          {
            session,
          },
        );

        result = {
          expiredBookings: bookingUpdateResult.modifiedCount,
          releasedCarts: cartIds.length,
        };
      });

      return result;
    } catch (error: any) {
      throw new Error(`Failed to expire pending payments: ${error.message}`);
    } finally {
      await session.endSession();
    }
  }

  static async cancelBooking(
    bookingId: string,
    userId: string,
    role: string,
    reason: string,
  ) {
    const booking =
      await Booking.findOne({
        _id: bookingId,
        isDeleted: false,
      });

    if (!booking) {
      throw new Error(
        "Booking not found",
      );
    }

    const isOwner =
      booking.userId?.toString() ===
      userId;

    const isAdmin =
      role === "ADMIN" ||
      role === "SUBADMIN";

    if (!isOwner && !isAdmin) {
      throw new Error(
        "You are not authorized to cancel this booking",
      );
    }

    return this.updateBookingStatus(
      bookingId,
      "CANCELLED",
      userId,
      role,
      reason,
    );
  }

  static async getMyBookingById(
    bookingId: string,
    userId: string,
  ) {
    const booking = await Booking.findOne({
      _id: bookingId,
      userId,
      isDeleted: false,
    })
      .populate({
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
      })
      .populate({
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
      })
      .lean();

    if (!booking) {
      throw new Error("Booking not found");
    }

    const assignedCoordinator =
      booking.assignment
        ?.assignedCoordinatorId as any;

    const coordinator =
      assignedCoordinator &&
        typeof assignedCoordinator === "object"
        ? {
          coordinatorId:
            assignedCoordinator._id,

          fullName:
            assignedCoordinator.fullName,

          profileImage:
            assignedCoordinator.profileImage,

          gender:
            assignedCoordinator.gender,

          userReference:
            assignedCoordinator.userReference,

          caste:
            assignedCoordinator.caste,

          gotra:
            assignedCoordinator.gotra,

          rating: {
            averageRating:
              assignedCoordinator
                .coordinatorProfile
                ?.averageRating ?? 0,

            totalRatings:
              assignedCoordinator
                .coordinatorProfile
                ?.totalRatings ?? 0,
          },

          experience: {
            totalCompletedBookings:
              assignedCoordinator
                .coordinatorProfile
                ?.totalCompletedBookings ?? 0,
          },

          availabilityStatus:
            assignedCoordinator
              .coordinatorProfile
              ?.availabilityStatus,
        }
        : null;

    /*
     * Format every coordinator who has
     * received an assignment request.
     */
    const coordinatorRequests =
      booking.assignment?.requests?.map(
        (request: any) => {
          const requestedCoordinator =
            request.coordinatorId;

          return {
            requestId:
              request._id,

            status:
              request.status,

            assignmentType:
              request.assignmentType,

            requestedAt:
              request.requestedAt,

            responseDeadlineAt:
              request.responseDeadlineAt,

            respondedAt:
              request.respondedAt,

            rejectionReason:
              request.rejectionReason,

            coordinator:
              requestedCoordinator &&
                typeof requestedCoordinator ===
                "object"
                ? {
                  coordinatorId:
                    requestedCoordinator._id,

                  fullName:
                    requestedCoordinator.fullName,

                  profileImage:
                    requestedCoordinator.profileImage,

                  gender:
                    requestedCoordinator.gender,

                  userReference:
                    requestedCoordinator.userReference,

                  caste:
                    requestedCoordinator.caste,

                  gotra:
                    requestedCoordinator.gotra,

                  rating: {
                    averageRating:
                      requestedCoordinator
                        .coordinatorProfile
                        ?.averageRating ?? 0,

                    totalRatings:
                      requestedCoordinator
                        .coordinatorProfile
                        ?.totalRatings ?? 0,
                  },

                  experience: {
                    totalCompletedBookings:
                      requestedCoordinator
                        .coordinatorProfile
                        ?.totalCompletedBookings ?? 0,
                  },

                  availabilityStatus:
                    requestedCoordinator
                      .coordinatorProfile
                      ?.availabilityStatus,
                }
                : null,
          };
        },
      ) ?? [];

    const {
      assignment,
      ...bookingData
    } = booking;

    return {
      ...bookingData,

      assignment: assignment
        ? {
          ...assignment,

          assignedCoordinatorId:
            assignedCoordinator?._id ??
            assignedCoordinator ??
            null,

          requests:
            coordinatorRequests,
        }
        : null,

      /*
       * Current selected / accepted coordinator.
       */
      coordinator,
    };
  }

  static async getMyBookings(params: {
    userId: string;
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    return this.findBookings({
      userId: params.userId,
      ...(params.status && { status: params.status }),
      ...(params.page && { page: params.page }),
      ...(params.limit && { limit: params.limit }),
      ...(params.sortBy && { sortBy: params.sortBy }),
      ...(params.sortOrder && { sortOrder: params.sortOrder }),
      includeCoordinatorProfile: true,
    });
  }

  static async getBookingCategory(
    status: BookingStatus,
  ): Promise<BookingCategory> {
    switch (status) {
      case "PENDING_PAYMENT":
        return "PAYMENT_PENDING";

      case "EXPIRED":
        return "EXPIRED";

      case "IN_PROGRESS":
        return "ONGOING";

      case "COMPLETED":
        return "COMPLETED";

      case "CANCELLED":
        return "CANCELLED";

      default:
        return "UPCOMING";
    }
  }

  static async getAvailableCoordinators(
    bookingId: string,
    userId: string,
    filters: CoordinatorFilters = {},
  ) {
    const booking = await Booking.findOne({
      _id: bookingId,
      isDeleted: false,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.payment.status !== "PAID") {
      throw new Error(
        "Payment must be completed before selecting a coordinator",
      );
    }

    if (
      ![
        "CONFIRMED",
        "ASSIGNMENT_PENDING",
        "ASSIGNED",
      ].includes(booking.status)
    ) {
      throw new Error(
        "Coordinator selection is not available for this booking",
      );
    }

    const isOwner =
      booking.userId?.toString() ===
      userId;

    if (!isOwner) {
      throw new Error(
        "You are not authorized to select a coordinator for this booking",
      );
    }

    const locationIds =
      this.getBookingLocationIds(booking);

    if (locationIds.length === 0) {
      throw new Error(
        "No service location found in booking",
      );
    }

    /*
     * Use proposed reschedule date if provided.
     * Otherwise use current booking scheduled date.
     */
    let targetScheduledAt =
      booking.scheduledAt;

    if (filters.scheduledAt) {
      const requestedDate =
        new Date(filters.scheduledAt);

      if (
        Number.isNaN(
          requestedDate.getTime(),
        )
      ) {
        throw new Error(
          "Invalid scheduled date",
        );
      }

      if (
        requestedDate <=
        new Date()
      ) {
        throw new Error(
          "Scheduled date must be in the future",
        );
      }

      targetScheduledAt =
        requestedDate;
    }

    const requestedCoordinatorIds =
      this.getRequestedCoordinatorIds(
        booking,
        targetScheduledAt,
      );

    const query: Record<string, any> = {
      role: "COORDINATOR",
      isActive: true,
      isDocumentVerified: true,

      "coordinatorProfile.approvalStatus":
        "APPROVED",

      "coordinatorProfile.availabilityStatus":
        "AVAILABLE",
    };

    const serviceableLocationMatch: Record<
      string,
      any
    > = {
      locationId: {
        $in: locationIds,
      },
    };

    if (filters.matchCaste) {
      const bookingCaste =
        booking.customerDetails?.caste?.trim();

      if (!bookingCaste) {
        throw new Error(
          "Caste matching was requested, but booking caste is missing",
        );
      }

      serviceableLocationMatch.caste =
        bookingCaste;
    }

    if (filters.matchGotra) {
      const bookingGotra =
        booking.customerDetails?.gotra?.trim();

      if (!bookingGotra) {
        throw new Error(
          "Gotra matching was requested, but booking gotra is missing",
        );
      }

      serviceableLocationMatch.gotra =
        bookingGotra;
    }

    query[
      "coordinatorProfile.serviceableLocations"
    ] = {
      $elemMatch:
        serviceableLocationMatch,
    };

    /*
 * Exclude coordinators who have already
 * received this booking request for the
 * current target scheduled date.
 *
 * Coordinators rejected/expired for another
 * date remain eligible after rescheduling.
 */
    if (
      requestedCoordinatorIds.length > 0
    ) {
      query._id = {
        $nin:
          requestedCoordinatorIds,
      };
    }

    if (
      filters.minRating !== undefined
    ) {
      query[
        "coordinatorProfile.averageRating"
      ] = {
        $gte:
          filters.minRating,
      };
    }

    if (
      filters.minCompletedBookings !==
      undefined
    ) {
      query[
        "coordinatorProfile.totalCompletedBookings"
      ] = {
        $gte:
          filters.minCompletedBookings,
      };
    }

    if (
      filters.autoAssignmentEnabled !==
      undefined
    ) {
      query[
        "coordinatorProfile.autoAssignmentEnabled"
      ] =
        filters.autoAssignmentEnabled;
    }

    const sortDirection: 1 | -1 =
      filters.sortOrder === "asc"
        ? 1
        : -1;

    const sort: Record<
      string,
      1 | -1
    > = {};

    switch (filters.sortBy) {
      case "completedBookings":
        sort[
          "coordinatorProfile.totalCompletedBookings"
        ] =
          sortDirection;
        break;

      case "acceptanceRate":
        sort[
          "coordinatorProfile.acceptanceRate"
        ] =
          sortDirection;
        break;

      case "rating":
      default:
        sort[
          "coordinatorProfile.averageRating"
        ] =
          sortDirection;

        sort[
          "coordinatorProfile.totalCompletedBookings"
        ] = -1;

        break;
    }

    /*
     * Fetch possible coordinators first.
     *
     * maxDailyBookings is required internally
     * to check availability for targetScheduledAt.
     */
    const coordinators =
      await User.find(query)
        .select({
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
        })
        .sort(sort)
        .lean();

    /*
     * If booking has a target date,
     * remove coordinators who have already
     * reached their daily booking limit.
     */
    let availableCoordinators =
      coordinators;

    if (targetScheduledAt) {
      const startOfDay =
        new Date(targetScheduledAt);

      startOfDay.setHours(
        0,
        0,
        0,
        0,
      );

      const endOfDay =
        new Date(targetScheduledAt);

      endOfDay.setHours(
        23,
        59,
        59,
        999,
      );

      const coordinatorAvailability =
        await Promise.all(
          coordinators.map(
            async (
              coordinator,
            ) => {
              const assignedBookings =
                await Booking.countDocuments(
                  {
                    _id: {
                      $ne:
                        booking._id,
                    },

                    isDeleted:
                      false,

                    "assignment.assignedCoordinatorId":
                      coordinator._id,

                    scheduledAt: {
                      $gte:
                        startOfDay,

                      $lte:
                        endOfDay,
                    },

                    status: {
                      $in: [
                        "ASSIGNED",
                        "IN_PROGRESS",
                      ],
                    },
                  },
                );

              const maxDailyBookings =
                coordinator
                  .coordinatorProfile
                  ?.maxDailyBookings ??
                5;

              return {
                coordinator,
                available:
                  assignedBookings <
                  maxDailyBookings,
              };
            },
          ),
        );

      availableCoordinators =
        coordinatorAvailability
          .filter(
            (item) =>
              item.available,
          )
          .map(
            (item) =>
              item.coordinator,
          );
    }

    const coordinatorList =
      availableCoordinators.map(
        (coordinator) => ({
          coordinatorId:
            coordinator._id,

          fullName:
            coordinator.fullName,

          profileImage:
            coordinator.profileImage,

          gender:
            coordinator.gender,

          userReference:
            coordinator.userReference,

          caste:
            coordinator.caste,

          gotra:
            coordinator.gotra,

          rating: {
            averageRating:
              coordinator
                .coordinatorProfile
                ?.averageRating ??
              0,

            totalRatings:
              coordinator
                .coordinatorProfile
                ?.totalRatings ??
              0,
          },

          experience: {
            totalCompletedBookings:
              coordinator
                .coordinatorProfile
                ?.totalCompletedBookings ??
              0,
          },

          availabilityStatus:
            coordinator
              .coordinatorProfile
              ?.availabilityStatus,
        }),
      );

    return {
      bookingId:
        booking._id,

      bookingLocationIds:
        locationIds,

      /*
       * Important for frontend:
       * tells UI which date this coordinator
       * list was calculated for.
       */
      scheduledAt:
        targetScheduledAt ??
        null,

      isRescheduleSelection:
        !!filters.scheduledAt,

      bookingPreferences: {
        caste:
          booking.customerDetails
            ?.caste,

        gotra:
          booking.customerDetails
            ?.gotra,
      },

      appliedFilters: {
        matchCaste:
          filters.matchCaste ??
          false,

        matchGotra:
          filters.matchGotra ??
          false,

        minRating:
          filters.minRating ??
          null,

        minCompletedBookings:
          filters.minCompletedBookings ??
          null,

        autoAssignmentEnabled:
          filters.autoAssignmentEnabled ??
          null,

        sortBy:
          filters.sortBy ??
          "rating",

        sortOrder:
          filters.sortOrder ??
          "desc",

        scheduledAt:
          filters.scheduledAt ??
          null,
      },

      assignmentStatus:
        booking.assignment
          ?.status,

      assignmentExpiresAt:
        booking.assignment
          ?.assignmentExpiresAt,

      total:
        coordinatorList.length,

      coordinators:
        coordinatorList,
    };
  }

  static async selectCoordinator(params: {
    bookingId: string;
    coordinatorId: string;
    selectedBy: string;
    assignmentType: "MANUAL" | "AUTO";

    // Used only when selecting coordinator
    // during a reschedule flow.
    scheduledAt?: string;

    // Required when scheduledAt is provided.
    rescheduleReason?: string;
  }) {
    const {
      bookingId,
      coordinatorId,
      selectedBy,
      assignmentType,
      scheduledAt,
      rescheduleReason,
    } = params;

    const booking = await Booking.findOne({
      _id: bookingId,
      isDeleted: false,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.payment.status !== "PAID") {
      throw new Error(
        "Booking payment must be paid before coordinator selection",
      );
    }

    if (
      ![
        "CONFIRMED",
        "ASSIGNMENT_PENDING",
        "ASSIGNED",
      ].includes(booking.status)
    ) {
      throw new Error(
        `Cannot select coordinator for ${booking.status} booking`,
      );
    }

    if (
      !scheduledAt &&
      booking.assignment?.assignmentExpiresAt &&
      booking.assignment.assignmentExpiresAt <=
      new Date()
    ) {
      throw new Error(
        "Coordinator assignment window has expired",
      );
    }

    if (
      booking.userId?.toString() !== selectedBy
    ) {
      throw new Error(
        "Only the booking owner can select a coordinator",
      );
    }

    /*
     * ------------------------------------------------
     * Determine target schedule.
     * ------------------------------------------------
     *
     * Normal selection:
     *   targetScheduledAt = booking.scheduledAt
     *
     * Reschedule selection:
     *   targetScheduledAt = params.scheduledAt
     */
    let targetScheduledAt =
      booking.scheduledAt;

    const isRescheduleSelection =
      !!scheduledAt;

    if (scheduledAt) {
      const requestedSchedule =
        new Date(scheduledAt);

      if (
        Number.isNaN(
          requestedSchedule.getTime(),
        )
      ) {
        throw new Error(
          "Invalid scheduled date",
        );
      }

      if (
        requestedSchedule <= new Date()
      ) {
        throw new Error(
          "Scheduled date must be in the future",
        );
      }

      if (!rescheduleReason?.trim()) {
        throw new Error(
          "Reschedule reason is required",
        );
      }

      targetScheduledAt =
        requestedSchedule;
    }

    if (!targetScheduledAt) {
      throw new Error(
        "Booking schedule is required before selecting a coordinator",
      );
    }

    /*
     * ------------------------------------------------
     * Don't allow selecting coordinator who has already
     * received this booking request.
     * ------------------------------------------------
     */

    const requestedCoordinatorIds =
      this.getRequestedCoordinatorIds(
        booking,
        targetScheduledAt,
      );

    const alreadyRequested =
      requestedCoordinatorIds.some(
        (id) =>
          id.toString() ===
          coordinatorId,
      );

    if (alreadyRequested) {
      throw new Error(
        "This coordinator has already received this booking request",
      );
    }

    /*
     * ------------------------------------------------
     * Validate coordinator.
     * ------------------------------------------------
     */

    const locationIds =
      this.getBookingLocationIds(
        booking,
      );

    const coordinator =
      await User.findOne({
        _id:
          coordinatorId,

        role:
          "COORDINATOR",

        isActive:
          true,

        isDocumentVerified:
          true,

        "coordinatorProfile.approvalStatus":
          "APPROVED",

        "coordinatorProfile.availabilityStatus":
          "AVAILABLE",

        /*
         * Important:
         * Selected coordinator must also
         * support the booking location.
         */
        "coordinatorProfile.serviceableLocations.locationId":
        {
          $in:
            locationIds,
        },
      });

    if (!coordinator) {
      throw new Error(
        "Selected coordinator is not available for this booking",
      );
    }

    /*
     * ------------------------------------------------
     * Validate coordinator capacity on TARGET DATE.
     * ------------------------------------------------
     *
     * This is the important fix.
     *
     * Previously this was always checking
     * booking.scheduledAt.
     *
     * Now during reschedule it checks the
     * proposed new date.
     */

    const startOfDay =
      new Date(
        targetScheduledAt,
      );

    startOfDay.setHours(
      0,
      0,
      0,
      0,
    );

    const endOfDay =
      new Date(
        targetScheduledAt,
      );

    endOfDay.setHours(
      23,
      59,
      59,
      999,
    );

    const bookedCount =
      await Booking.countDocuments({
        /*
         * Don't count this booking itself.
         *
         * Important especially when replacing
         * coordinator during reschedule.
         */
        _id: {
          $ne:
            booking._id,
        },

        isDeleted:
          false,

        "assignment.assignedCoordinatorId":
          coordinator._id,

        scheduledAt: {
          $gte:
            startOfDay,

          $lte:
            endOfDay,
        },

        status: {
          $in: [
            "ASSIGNED",
            "IN_PROGRESS",
          ],
        },
      });

    const maxDailyBookings =
      coordinator
        .coordinatorProfile
        ?.maxDailyBookings ??
      5;

    if (
      bookedCount >=
      maxDailyBookings
    ) {
      throw new Error(
        "Coordinator has reached the maximum booking limit for the selected date",
      );
    }

    /*
     * ------------------------------------------------
     * Handle reschedule before creating new request.
     * ------------------------------------------------
     */

    let previousScheduledAt: Date | undefined;

    if (isRescheduleSelection && targetScheduledAt) {
      booking.assignment ??= {
        status: "NOT_STARTED",
        currentRound: 1,
        requests: [],
      };

      booking.assignment.currentRound ??= 1;

      const existingPendingReschedule =
        booking.assignment.pendingReschedule;

      const samePendingSchedule =
        existingPendingReschedule?.requestedScheduledAt?.getTime() ===
        targetScheduledAt.getTime();

      if (!samePendingSchedule) {
        booking.assignment.currentRound += 1;
        previousScheduledAt = booking.scheduledAt;

        booking.assignment.pendingReschedule = {
          ...(previousScheduledAt
            ? { previousScheduledAt }
            : {}),
          requestedScheduledAt: targetScheduledAt,
          reason: rescheduleReason!.trim(),
          requestedBy: new Types.ObjectId(selectedBy),
          requestedAt: new Date(),
          assignmentRound: booking.assignment.currentRound,
        };
      } else {
        previousScheduledAt =
          existingPendingReschedule.previousScheduledAt;
      }

      delete booking.assignment.assignmentExpiresAt;
    }

    /*
     * ------------------------------------------------
     * Send assignment request.
     * ------------------------------------------------
     *
     * assignCoordinatorRequest() already:
     *
     * - cancels existing pending request
     * - sets assignedCoordinatorId
     * - sets PENDING_RESPONSE
     * - creates assignment request
     * - changes booking status to ASSIGNMENT_PENDING
     */

    const updatedBooking =
      await this.assignCoordinatorRequest({
        booking,
        coordinatorId,
        selectedBy,
        assignmentType,
        scheduledAt: targetScheduledAt,
      });

    return {
      bookingId:
        updatedBooking._id,

      bookingReference:
        updatedBooking.bookingReference,

      bookingStatus:
        updatedBooking.status,

      assignmentStatus:
        updatedBooking.assignment
          ?.status,

      coordinatorId,

      assignmentRound:
        updatedBooking.assignment
          ?.currentRound,

      /*
       * Helpful for frontend.
       */
      isRescheduleSelection,

      previousScheduledAt:
        previousScheduledAt ??
        null,

      scheduledAt:
        targetScheduledAt,

      responseDeadlineAt:
        updatedBooking.assignment
          ?.responseDeadlineAt,

      assignmentExpiresAt:
        updatedBooking.assignment
          ?.assignmentExpiresAt,

      message:
        isRescheduleSelection
          ? "New coordinator selected and reschedule request submitted successfully"
          : "Coordinator selected successfully",
    };
  }

  static async respondToAssignment(params: {
    bookingId: string;
    coordinatorId: string;
    action: AssignmentAction;
    reason?: string;
  }) {
    const { bookingId, coordinatorId, action, reason } = params;
    const session = await mongoose.startSession();

    try {
      let result: Record<string, any> = {};

      await session.withTransaction(async () => {
        const booking = await Booking.findOne({
          _id: bookingId,
          isDeleted: false,
        }).session(session);

        if (!booking || !booking.assignment) {
          throw new Error("Booking assignment not found");
        }

        if (booking.status === "ASSIGNED") {
          throw new Error(
            "This booking has already been accepted by another coordinator",
          );
        }

        const now = new Date();
        const currentRound = booking.assignment.currentRound ?? 1;

        const currentRequest = booking.assignment.requests
          ?.slice()
          .reverse()
          .find(
            (request: any) =>
              request.coordinatorId.toString() === coordinatorId &&
              request.status === "PENDING" &&
              (request.assignmentRound ?? 1) === currentRound,
          );

        if (!currentRequest) {
          throw new Error("Pending assignment request not found");
        }

        if (currentRequest.responseDeadlineAt <= now) {
          currentRequest.status = "EXPIRED";
          currentRequest.respondedAt = now;

          const hasOtherPending = booking.assignment.requests.some(
            (request: any) =>
              request.status === "PENDING" &&
              (request.assignmentRound ?? 1) === currentRound,
          );

          booking.assignment.status = hasOtherPending
            ? "PENDING_RESPONSE"
            : "PENDING_SELECTION";

          await booking.save({ session });
          throw new Error("Coordinator response deadline has expired");
        }

        currentRequest.respondedAt = now;

        if (action === "REJECT") {
          currentRequest.status = "REJECTED";
          const trimmedReason = reason?.trim();

          if (trimmedReason) {
            currentRequest.rejectionReason = trimmedReason;
          } else {
            delete currentRequest.rejectionReason;
          }

          const hasOtherPending = booking.assignment.requests.some(
            (request: any) =>
              request.status === "PENDING" &&
              (request.assignmentRound ?? 1) === currentRound,
          );

          booking.assignment.status = hasOtherPending
            ? "PENDING_RESPONSE"
            : "PENDING_SELECTION";
          booking.status = "ASSIGNMENT_PENDING";

          await booking.save({ session });

          result = {
            bookingId: booking._id,
            bookingStatus: booking.status,
            assignmentStatus: booking.assignment.status,
            rejectedCoordinatorId: coordinatorId,
            hasOtherPendingRequests: hasOtherPending,
          };
          return;
        }

        // Atomically claim the booking. Only one coordinator can win.
        const claimed = await Booking.updateOne(
          {
            _id: booking._id,
            status: "ASSIGNMENT_PENDING",
            $or: [
              { "assignment.assignedCoordinatorId": { $exists: false } },
              { "assignment.assignedCoordinatorId": null },
            ],
          },
          {
            $set: {
              status: "ASSIGNED",
              "assignment.status": "ACCEPTED",
              "assignment.assignedCoordinatorId":
                new Types.ObjectId(coordinatorId),
              "assignment.assignedAt": now,
              "assignment.coordinatorAcceptedAt": now,
            },
          },
          { session },
        );

        if (claimed.modifiedCount === 0) {
          throw new Error(
            "This booking has already been accepted by another coordinator",
          );
        }

        currentRequest.status = "ACCEPTED";

        for (const request of booking.assignment.requests) {
          if (
            request._id?.toString() !== currentRequest._id?.toString() &&
            request.status === "PENDING" &&
            (request.assignmentRound ?? 1) === currentRound
          ) {
            request.status = "SUPERSEDED";
            request.closureReason = "ANOTHER_COORDINATOR_ACCEPTED";
            request.respondedAt = now;
          }
        }

        const pendingReschedule = booking.assignment.pendingReschedule;

        if (
          pendingReschedule &&
          pendingReschedule.assignmentRound === currentRound
        ) {
          booking.rescheduleHistory ??= [];
          booking.rescheduleHistory.push({
            ...(pendingReschedule.previousScheduledAt
              ? {
                previousScheduledAt:
                  pendingReschedule.previousScheduledAt,
              }
              : {}),
            newScheduledAt:
              pendingReschedule.requestedScheduledAt,
            reason: pendingReschedule.reason,
            rescheduledBy: pendingReschedule.requestedBy,
            rescheduledByRole: "USER",
            rescheduledAt: now,
          });

          booking.scheduledAt =
            pendingReschedule.requestedScheduledAt;
          delete booking.assignment.pendingReschedule;
        }

        booking.status = "ASSIGNED";
        booking.assignment.status = "ACCEPTED";
        booking.assignment.assignedCoordinatorId =
          new Types.ObjectId(coordinatorId);
        booking.assignment.assignedAt = now;
        booking.assignment.coordinatorAcceptedAt = now;
        delete booking.assignment.responseDeadlineAt;
        delete booking.assignment.assignmentExpiresAt;

        await booking.save({ session });

        await User.updateOne(
          { _id: coordinatorId },
          {
            $inc: {
              "coordinatorProfile.totalAssignedBookings": 1,
            },
          },
          { session },
        );

        result = {
          bookingId: booking._id,
          bookingStatus: booking.status,
          assignmentStatus: booking.assignment.status,
          coordinatorId,
          acceptedAt: now,
          scheduledAt: booking.scheduledAt,
        };
      });

      return result;
    } finally {
      await session.endSession();
    }
  }

  static async requestReassignment(params: {
    bookingId: string;
    requestedBy: string;
    requestedByRole: ReassignmentRequestedByRole;
    reason: string;
  }) {
    const {
      bookingId,
      requestedBy,
      requestedByRole,
      reason,
    } = params;

    const booking = await Booking.findOne({
      _id: bookingId,
      isDeleted: false,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    const isOwner =
      booking.userId?.toString() === requestedBy;

    const isAssignedCoordinator =
      booking.assignment
        ?.assignedCoordinatorId
        ?.toString() === requestedBy;

    const isAdmin =
      requestedByRole === "ADMIN";

    if (
      requestedByRole === "USER" &&
      !isOwner
    ) {
      throw new Error(
        "Only the booking owner can request reassignment",
      );
    }

    if (
      requestedByRole === "COORDINATOR" &&
      !isAssignedCoordinator
    ) {
      throw new Error(
        "Only the assigned coordinator can request reassignment",
      );
    }

    if (
      !isOwner &&
      !isAssignedCoordinator &&
      !isAdmin &&
      requestedByRole !== "SYSTEM"
    ) {
      throw new Error(
        "You are not authorized to request reassignment",
      );
    }

    if (
      !["ASSIGNED", "ASSIGNMENT_PENDING"].includes(
        booking.status,
      )
    ) {
      throw new Error(
        "Reassignment is available only for assigned bookings",
      );
    }

    if (
      booking.status === "IN_PROGRESS" ||
      booking.execution?.startedAt
    ) {
      throw new Error(
        "Reassignment cannot be requested after execution starts",
      );
    }

    const now = new Date();

    if (!booking.assignment) {
      throw new Error(
        "Booking assignment details not found",
      );
    }

    const currentRound =
      booking.assignment.currentRound ?? 1;

    for (const request of booking.assignment.requests ?? []) {
      if (
        request.status === "PENDING" &&
        (request.assignmentRound ?? 1) === currentRound
      ) {
        request.status = "CANCELLED";
        request.closureReason = "REASSIGNMENT_STARTED";
        request.respondedAt = now;
      }
    }

    booking.assignment.currentRound = currentRound + 1;
    booking.assignment.status =
      "REASSIGNMENT_REQUESTED";

    booking.assignment.reassignment = {
      requestedBy: new Types.ObjectId(requestedBy),
      requestedByRole,
      reason: reason.trim(),
      requestedAt: now,
    };

    delete booking.assignment.assignedCoordinatorId;
    delete booking.assignment.coordinatorAcceptedAt;
    delete booking.assignment.responseDeadlineAt;
    delete booking.assignment.pendingReschedule;

    booking.status = "ASSIGNMENT_PENDING";

    await booking.save();

    return {
      bookingId: booking._id,
      bookingStatus: booking.status,
      assignmentStatus:
        booking.assignment.status,
      reassignment:
        booking.assignment.reassignment,
    };
  }

  static async getCoordinatorBookingList(params: {
    coordinatorId: string;
    view: CoordinatorBookingView;
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const {
      coordinatorId,
      view,
      status,
      page = 1,
      limit = 20,
      sortBy,
      sortOrder,
    } = params;

    if (!Types.ObjectId.isValid(coordinatorId)) {
      throw new Error("Invalid coordinator ID");
    }

    const safePage =
      Number.isInteger(page) && page > 0
        ? page
        : 1;

    const safeLimit =
      Number.isInteger(limit) && limit > 0
        ? Math.min(limit, 100)
        : 20;

    const skip =
      (safePage - 1) * safeLimit;

    const coordinatorObjectId =
      new Types.ObjectId(coordinatorId);

    const query: Record<string, any> = {
      isDeleted: false,
    };

    let selectFields: Record<string, 1> = {};
    let sort: Record<string, 1 | -1> = {};

    if (view === "REQUESTS") {
      query.status =
        "ASSIGNMENT_PENDING";

      query["assignment.status"] =
        "PENDING_RESPONSE";

      query["assignment.requests"] = {
        $elemMatch: {
          coordinatorId:
            coordinatorObjectId,

          status:
            "PENDING",

          responseDeadlineAt: {
            $gt: new Date(),
          },
        },
      };

      selectFields = {
        userId: 1,
        bookingReference: 1,
        customerDetails: 1,

        /*
         * Contains:
         *
         * SERVICE:
         * - serviceConfiguration.serviceSnapshot
         * - serviceConfiguration.tier
         * - serviceConfiguration.location
         *
         * PACKAGE:
         * - packageConfiguration.packageSnapshot
         * - selectedServices[].tier
         * - selectedServices[].location
         * - addonServices[].tier
         * - addonServices[].location
         */
        entries: 1,

        scheduledAt: 1,
        assignment: 1,
        pricing: 1,
        createdAt: 1,
      };

      sort = {
        "assignment.requests.requestedAt":
          sortOrder === "asc"
            ? 1
            : -1,
      };
    } else {
      query[
        "assignment.assignedCoordinatorId"
      ] = coordinatorObjectId;

      query["assignment.status"] =
        "ACCEPTED";

      if (status) {
        query.status = status;
      } else {
        query.status = {
          $in: [
            "ASSIGNED",
            "IN_PROGRESS",
            "COMPLETED",
            "CANCELLED",
          ],
        };
      }

      selectFields = {
        userId: 1,
        bookingReference: 1,
        status: 1,
        customerDetails: 1,

        /*
         * Includes complete package/service
         * snapshot, tier and location details.
         */
        entries: 1,

        scheduledAt: 1,
        assignment: 1,
        execution: 1,
        pricing: 1,
        completedAt: 1,
        createdAt: 1,
      };

      const allowedSortFields = new Set([
        "scheduledAt",
        "createdAt",
        "completedAt",
        "status",
        "pricing.grandTotal",
      ]);

      const safeSortBy =
        sortBy &&
          allowedSortFields.has(sortBy)
          ? sortBy
          : "scheduledAt";

      sort = {
        [safeSortBy]:
          sortOrder === "desc"
            ? -1
            : 1,
      };
    }

    const [data, total] =
      await Promise.all([
        Booking.find(query)
          .select(selectFields)
          .populate({
            path: "userId",
            select: {
              fullName: 1,
              profileImage: 1,
              phoneNumber: 1,
              email: 1,
              userReference: 1,
            },
          })
          .sort(sort)
          .skip(skip)
          .limit(safeLimit)
          .lean(),

        Booking.countDocuments(query),
      ]);

    const formattedData = data.map(
      (booking: any) => {
        const populatedUser =
          booking.userId &&
            typeof booking.userId === "object" &&
            "_id" in booking.userId
            ? booking.userId
            : null;

        const bookingEntries =
          booking.entries?.map(
            (entry: any) => {
              if (
                entry.entryType === "SERVICE"
              ) {
                const service =
                  entry.serviceConfiguration;

                return {
                  entryType: "SERVICE",

                  service: service
                    ? {
                      serviceId:
                        service.serviceId,

                      name:
                        service
                          .serviceSnapshot
                          ?.name,

                      shortDescription:
                        service
                          .serviceSnapshot
                          ?.shortDescription,

                      thumbnailImage:
                        service
                          .serviceSnapshot
                          ?.thumbnailImage,

                      serviceReference:
                        service
                          .serviceSnapshot
                          ?.serviceReference,

                      serviceRole:
                        service.serviceRole,

                      subService:
                        service.subService ??
                        null,

                      tier:
                        service.tier
                          ? {
                            tierId:
                              service
                                .tier
                                .tierId,

                            name:
                              service
                                .tier
                                .name,
                          }
                          : null,

                      location:
                        service.location
                          ? {
                            locationId:
                              service
                                .location
                                .locationId,

                            name:
                              service
                                .location
                                .name,
                          }
                          : null,

                      components:
                        service.components ??
                        [],

                      pricing:
                        service.pricing,
                    }
                    : null,
                };
              }

              if (
                entry.entryType === "PACKAGE"
              ) {
                const packageConfiguration =
                  entry.packageConfiguration;

                const formatService = (
                  service: any,
                ) => ({
                  serviceId:
                    service.serviceId,

                  name:
                    service.serviceSnapshot
                      ?.name,

                  shortDescription:
                    service.serviceSnapshot
                      ?.shortDescription,

                  thumbnailImage:
                    service.serviceSnapshot
                      ?.thumbnailImage,

                  serviceReference:
                    service.serviceSnapshot
                      ?.serviceReference,

                  serviceRole:
                    service.serviceRole,

                  subService:
                    service.subService ??
                    null,

                  tier:
                    service.tier
                      ? {
                        tierId:
                          service.tier
                            .tierId,

                        name:
                          service.tier
                            .name,
                      }
                      : null,

                  location:
                    service.location
                      ? {
                        locationId:
                          service.location
                            .locationId,

                        name:
                          service.location
                            .name,
                      }
                      : null,

                  components:
                    service.components ??
                    [],

                  pricing:
                    service.pricing,
                });

                return {
                  entryType: "PACKAGE",

                  package:
                    packageConfiguration
                      ? {
                        packageId:
                          packageConfiguration
                            .packageId,

                        name:
                          packageConfiguration
                            .packageSnapshot
                            ?.name,

                        shortDescription:
                          packageConfiguration
                            .packageSnapshot
                            ?.shortDescription,

                        thumbnailImage:
                          packageConfiguration
                            .packageSnapshot
                            ?.thumbnailImage,

                        packageReference:
                          packageConfiguration
                            .packageSnapshot
                            ?.packageReference,

                        selectedServices:
                          packageConfiguration
                            .selectedServices
                            ?.map(
                              formatService,
                            ) ?? [],

                        addonServices:
                          packageConfiguration
                            .addonServices
                            ?.map(
                              formatService,
                            ) ?? [],

                        pricing:
                          packageConfiguration
                            .pricing,
                      }
                      : null,
                };
              }

              return entry;
            },
          ) ?? [];

        const {
          entries: _entries,
          userId: _userId,
          ...bookingData
        } = booking;

        return {
          ...bookingData,

          userId:
            populatedUser?._id ??
            booking.userId ??
            null,

          user: populatedUser
            ? {
              userId:
                populatedUser._id,

              fullName:
                populatedUser.fullName,

              profileImage:
                populatedUser.profileImage,

              phoneNumber:
                populatedUser.phoneNumber,

              email:
                populatedUser.email,

              userReference:
                populatedUser.userReference,
            }
            : null,

          entries: bookingEntries,
        };
      },
    );

    return {
      view,
      data: formattedData,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages:
        Math.ceil(total / safeLimit),
    };
  }

  static async processAssignmentTimeouts() {
    const now = new Date();

    const bookings = await Booking.find({
      isDeleted: false,
      status: "ASSIGNMENT_PENDING",
      "assignment.status": "PENDING_RESPONSE",
      "assignment.requests": {
        $elemMatch: {
          status: "PENDING",
          responseDeadlineAt: { $lte: now },
        },
      },
    });

    const result = {
      processed: 0,
      expiredRequests: 0,
      waitingForSelection: 0,
      assignmentExpired: 0,
    };

    for (const booking of bookings) {
      if (!booking.assignment) continue;

      const currentRound = booking.assignment.currentRound ?? 1;
      let changed = false;

      for (const request of booking.assignment.requests ?? []) {
        if (
          request.status === "PENDING" &&
          (request.assignmentRound ?? 1) === currentRound &&
          request.responseDeadlineAt <= now
        ) {
          request.status = "EXPIRED";
          request.respondedAt = now;
          result.expiredRequests += 1;
          changed = true;
        }
      }

      if (!changed) continue;
      result.processed += 1;

      const hasPending = booking.assignment.requests.some(
        (request: any) =>
          request.status === "PENDING" &&
          (request.assignmentRound ?? 1) === currentRound,
      );

      if (hasPending) {
        booking.assignment.status = "PENDING_RESPONSE";
        await booking.save();
        continue;
      }

      booking.assignment.status = "PENDING_SELECTION";

      if (
        booking.assignment.assignmentExpiresAt &&
        booking.assignment.assignmentExpiresAt <= now
      ) {
        booking.status = "CONFIRMED";
        result.assignmentExpired += 1;
      } else {
        booking.status = "ASSIGNMENT_PENDING";
        result.waitingForSelection += 1;
      }

      await booking.save();
    }

    return result;
  }

  static async getBookingExecution(
    bookingId: string,
  ) {
    const booking = await Booking.findOne({
      _id: bookingId,
      isDeleted: false,
    })
      .select({
        bookingReference: 1,
        status: 1,
        scheduledAt: 1,
        assignment: 1,
        execution: 1,
        completedAt: 1,
      })
      .populate(
        "assignment.assignedCoordinatorId",
        "fullName phoneNumber profileImage",
      )
      .lean();

    if (!booking) {
      throw new Error("Booking not found");
    }

    return {
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      bookingStatus: booking.status,
      scheduledAt: booking.scheduledAt,
      coordinator:
        booking.assignment?.assignedCoordinatorId,
      assignmentStatus:
        booking.assignment?.status,
      execution:
        booking.execution ?? {
          stage: "NOT_STARTED",
          serviceExecutions: [],
          milestones: [],
          progressPercentage: 0,
        },
      completedAt: booking.completedAt,
    };
  }

  static async markCoordinatorArrived(params: {
    bookingId: string;
    coordinatorId: string;
  }) {
    const { bookingId, coordinatorId } = params;

    const booking = await Booking.findOne({
      _id: bookingId,
      isDeleted: false,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status !== "ASSIGNED") {
      throw new Error(
        "Coordinator can arrive only for an assigned booking",
      );
    }

    if (
      booking.assignment?.assignedCoordinatorId?.toString() !==
      coordinatorId
    ) {
      throw new Error(
        "Coordinator is not assigned to this booking",
      );
    }

    const now = new Date();

    /*
     * Initialize booking execution.
     */
    booking.execution ??= {
      stage: "NOT_STARTED",
      serviceExecutions: [],
      milestones: [],
      progressPercentage: 0,
    };

    /*
     * Create service executions ONCE.
     *
     * Never regenerate them after execution has started,
     * otherwise executionIds already used by frontend
     * would become invalid.
     */
    if (
      !booking.execution.serviceExecutions ||
      booking.execution.serviceExecutions.length === 0
    ) {
      const serviceExecutions =
        this.buildServiceExecutions(booking);

      if (serviceExecutions.length === 0) {
        throw new Error(
          "Booking does not contain any executable services",
        );
      }

      booking.execution.serviceExecutions =
        serviceExecutions;
    }

    booking.status = "IN_PROGRESS";

    booking.execution.stage =
      "CUSTOMER_VERIFICATION_PENDING";

    booking.execution.startedAt ??= now;

    this.addMilestoneIfMissing(
      booking,
      "COORDINATOR_ARRIVED",
      coordinatorId,
    );

    await booking.save();

    return {
      bookingId: booking._id,
      bookingStatus: booking.status,
      executionStage: booking.execution.stage,
      startedAt: booking.execution.startedAt,
      serviceExecutions:
        booking.execution.serviceExecutions,
      milestones:
        booking.execution.milestones,
    };
  }

  static async verifyBookingOtp(params: {
    bookingId: string;
    otp: string;
    verifiedBy: string;
  }) {
    const {
      bookingId,
      otp,
      verifiedBy,
    } = params;

    const booking = await Booking.findOne({
      _id: bookingId,
      isDeleted: false,
    }).select(
      "+execution.otpVerification.otpHash",
    );

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status !== "IN_PROGRESS") {
      throw new Error(
        "Booking must be in progress before OTP verification",
      );
    }

    if (
      booking.assignment?.assignedCoordinatorId?.toString() !==
      verifiedBy
    ) {
      throw new Error(
        "Only the assigned coordinator can verify this OTP",
      );
    }

    if (
      booking.execution?.stage !==
      "CUSTOMER_VERIFICATION_PENDING"
    ) {
      throw new Error(
        "Booking is not waiting for OTP verification",
      );
    }

    if (!otp?.trim()) {
      throw new Error("OTP is required");
    }

    booking.execution ??= {
      stage: "CUSTOMER_VERIFICATION_PENDING",
      serviceExecutions: [],
      milestones: [],
      progressPercentage: 0,
    };

    booking.execution.otpVerification ??= {
      status: "PENDING",
      attempts: 0,
    };

    booking.execution.otpVerification.attempts =
      (booking.execution.otpVerification.attempts ?? 0) +
      1;

    const isValid =
      await this.validateBookingOtp(
        booking,
        otp.trim(),
      );

    if (!isValid) {
      if (
        (booking.execution.otpVerification.attempts ?? 0) >=
        MAX_OTP_VERIFICATION_ATTEMPTS
      ) {
        booking.execution.otpVerification.status =
          "FAILED";
      } else {
        booking.execution.otpVerification.status =
          "PENDING";
      }

      await booking.save();

      throw new Error("Invalid OTP");
    }

    const now = new Date();

    booking.execution.otpVerification.status =
      "VERIFIED";

    booking.execution.otpVerification.verifiedAt =
      now;

    booking.execution.otpVerification.verifiedBy =
      new Types.ObjectId(verifiedBy);

    delete booking.execution.otpVerification.otpHash;

    booking.execution.stage =
      "SERVICE_EXECUTION";

    this.addMilestoneIfMissing(
      booking,
      "OTP_VERIFIED",
      verifiedBy,
    );

    await booking.save();

    return {
      bookingId: booking._id,
      otpStatus:
        booking.execution.otpVerification.status,
      executionStage:
        booking.execution.stage,
      verifiedAt:
        booking.execution.otpVerification.verifiedAt,
    };
  }

  static async startBookingService(params: {
    bookingId: string;
    executionId: string;
    startedBy: string;
  }) {
    const {
      bookingId,
      executionId,
      startedBy,
    } = params;

    const booking = await Booking.findOne({
      _id: bookingId,
      isDeleted: false,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status !== "IN_PROGRESS") {
      throw new Error(
        "Booking must be in progress before starting a service",
      );
    }

    if (
      booking.assignment
        ?.assignedCoordinatorId
        ?.toString() !== startedBy
    ) {
      throw new Error(
        "Only the assigned coordinator can start this service",
      );
    }

    if (
      booking.execution?.otpVerification?.status !==
      "VERIFIED"
    ) {
      throw new Error(
        "Customer OTP must be verified before starting services",
      );
    }

    const serviceExecution =
      booking.execution.serviceExecutions.find(
        (service) =>
          service.executionId === executionId,
      );

    if (!serviceExecution) {
      throw new Error(
        "Service execution not found",
      );
    }

    if (serviceExecution.status !== "PENDING") {
      throw new Error(
        `Cannot start service with status ${serviceExecution.status}`,
      );
    }

    serviceExecution.status = "IN_PROGRESS";
    serviceExecution.startedAt = new Date();

    booking.execution.stage =
      "SERVICE_EXECUTION";

    this.addMilestoneIfMissing(
      booking,
      "SERVICE_STARTED",
      startedBy,
    );

    await booking.save();

    return {
      bookingId: booking._id,
      executionId,
      serviceId: serviceExecution.serviceId,
      status: serviceExecution.status,
      startedAt: serviceExecution.startedAt,
    };
  }

  static async completeBookingService(params: {
    bookingId: string;
    executionId: string;
    completedBy: string;
    notes?: string;
  }) {
    const {
      bookingId,
      executionId,
      completedBy,
      notes,
    } = params;

    const booking = await Booking.findOne({
      _id: bookingId,
      isDeleted: false,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (
      booking.status !== "IN_PROGRESS" ||
      !booking.execution
    ) {
      throw new Error(
        "Booking execution is not active",
      );
    }

    if (
      booking.assignment
        ?.assignedCoordinatorId
        ?.toString() !== completedBy
    ) {
      throw new Error(
        "Only the assigned coordinator can complete this service",
      );
    }

    const serviceExecution =
      booking.execution.serviceExecutions.find(
        (service) =>
          service.executionId === executionId,
      );

    if (!serviceExecution) {
      throw new Error(
        "Service execution not found",
      );
    }

    if (serviceExecution.status !== "IN_PROGRESS") {
      throw new Error(
        "Only an in-progress service can be completed",
      );
    }

    serviceExecution.status = "COMPLETED";
    serviceExecution.completedAt = new Date();
    serviceExecution.completedBy =
      new Types.ObjectId(completedBy);

    if (notes?.trim()) {
      serviceExecution.notes = notes.trim();
    }

    booking.execution.progressPercentage =
      this.calculateExecutionProgress(
        booking.execution.serviceExecutions,
      );

    const allServicesResolved =
      booking.execution.serviceExecutions.length > 0 &&
      booking.execution.serviceExecutions.every(
        (service) =>
          service.status === "COMPLETED" ||
          service.status === "SKIPPED" ||
          service.status === "CANCELLED",
      );

    if (allServicesResolved) {
      this.addMilestoneIfMissing(
        booking,
        "ALL_SERVICES_COMPLETED",
        completedBy,
      );

      booking.execution.stage =
        "FINALIZATION";
    }

    await booking.save();

    return {
      bookingId: booking._id,
      executionId,
      serviceId: serviceExecution.serviceId,
      serviceStatus: serviceExecution.status,
      progressPercentage:
        booking.execution.progressPercentage,
      executionStage:
        booking.execution.stage,
      allServicesResolved,
    };
  }

  static async skipBookingService(params: {
    bookingId: string;
    executionId: string;
    skippedBy: string;
    reason: string;
  }) {
    const {
      bookingId,
      executionId,
      skippedBy,
      reason,
    } = params;

    const booking = await Booking.findOne({
      _id: bookingId,
      isDeleted: false,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (
      booking.status !== "IN_PROGRESS" ||
      !booking.execution
    ) {
      throw new Error(
        "Booking execution is not active",
      );
    }

    if (
      booking.assignment
        ?.assignedCoordinatorId
        ?.toString() !== skippedBy
    ) {
      throw new Error(
        "Only the assigned coordinator can skip this service",
      );
    }

    const serviceExecution =
      booking.execution.serviceExecutions.find(
        (service) =>
          service.executionId === executionId,
      );

    if (!serviceExecution) {
      throw new Error(
        "Service execution not found",
      );
    }

    if (
      !["PENDING", "IN_PROGRESS"].includes(
        serviceExecution.status,
      )
    ) {
      throw new Error(
        `Cannot skip service with status ${serviceExecution.status}`,
      );
    }

    serviceExecution.status = "SKIPPED";
    serviceExecution.completedAt = new Date();
    serviceExecution.completedBy =
      new Types.ObjectId(skippedBy);
    serviceExecution.notes = reason.trim();

    booking.execution.progressPercentage =
      this.calculateExecutionProgress(
        booking.execution.serviceExecutions,
      );

    const allServicesResolved =
      booking.execution.serviceExecutions.length > 0 &&
      booking.execution.serviceExecutions.every(
        (service) =>
          service.status === "COMPLETED" ||
          service.status === "SKIPPED" ||
          service.status === "CANCELLED",
      );

    if (allServicesResolved) {
      this.addMilestoneIfMissing(
        booking,
        "ALL_SERVICES_COMPLETED",
        skippedBy,
      );

      booking.execution.stage =
        "FINALIZATION";
    }

    await booking.save();

    return {
      bookingId: booking._id,
      executionId,
      serviceStatus: serviceExecution.status,
      progressPercentage:
        booking.execution.progressPercentage,
      executionStage:
        booking.execution.stage,
      allServicesResolved,
    };
  }

  static async addBookingMilestone(params: {
    bookingId: string;
    code: BookingMilestone;
    notes?: string;
    completedBy: string;
  }) {
    const {
      bookingId,
      code,
      notes,
      completedBy,
    } = params;

    const allowedMilestones: BookingMilestone[] = [
      "COORDINATOR_ARRIVED",
      "OTP_VERIFIED",
      "SERVICE_STARTED",
      "CUSTOMER_DETAILS_VERIFIED",
      "DOCUMENTS_COLLECTED",
      "FAMILY_TREE_STARTED",
      "FAMILY_TREE_COMPLETED",
      "ALL_SERVICES_COMPLETED",
      "FINAL_REPORT_GENERATED",
    ];

    if (!allowedMilestones.includes(code)) {
      throw new Error("Invalid milestone code");
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      isDeleted: false,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (
      booking.assignment
        ?.assignedCoordinatorId
        ?.toString() !== completedBy
    ) {
      throw new Error(
        "Only the assigned coordinator can update execution milestones",
      );
    }

    if (
      !["IN_PROGRESS", "ASSIGNED"].includes(
        booking.status,
      )
    ) {
      throw new Error(
        "Milestones cannot be added at the current booking stage",
      );
    }

    booking.execution ??= {
      stage: "NOT_STARTED",
      serviceExecutions: [],
      milestones: [],
      progressPercentage: 0,
    };

    const alreadyCompleted =
      booking.execution.milestones.some(
        (milestone) =>
          milestone.code === code,
      );

    if (alreadyCompleted) {
      throw new Error(
        "Milestone has already been completed",
      );
    }

    this.addMilestoneIfMissing(
      booking,
      code,
      completedBy,
      notes?.trim(),
    );

    switch (code) {
      case "FINAL_REPORT_GENERATED":
        booking.execution.stage =
          "FINALIZATION";
        break;

      case "ALL_SERVICES_COMPLETED":
        booking.execution.stage =
          "FINALIZATION";
        break;
    }

    await booking.save();

    return {
      bookingId: booking._id,
      code,
      executionStage:
        booking.execution.stage,
      milestones:
        booking.execution.milestones,
    };
  }

  static async completeBookingExecution(
    params: {
      bookingId: string;
      completedBy: string;
      notes?: string;
      proofUrls: string[];
    },
  ) {
    const {
      bookingId,
      completedBy,
      notes,
      proofUrls,
    } = params;

    const booking =
      await Booking.findOne({
        _id: bookingId,
        isDeleted: false,
      });

    if (!booking) {
      throw new Error(
        "Booking not found",
      );
    }

    /*
     * CRITICAL AUTH CHECK
     */
    if (
      booking.assignment
        ?.assignedCoordinatorId
        ?.toString() !== completedBy
    ) {
      throw new Error(
        "Only the assigned coordinator can complete this booking",
      );
    }

    if (
      booking.assignment?.status !==
      "ACCEPTED"
    ) {
      throw new Error(
        "Booking does not have an accepted coordinator",
      );
    }

    if (
      booking.status !==
      "IN_PROGRESS"
    ) {
      throw new Error(
        "Only an in-progress booking can be completed",
      );
    }

    if (!booking.execution) {
      throw new Error(
        "Booking execution details not found",
      );
    }

    /*
     * OTP should have been successfully
     * verified.
     */
    if (
      booking.execution
        .otpVerification
        ?.status !== "VERIFIED"
    ) {
      throw new Error(
        "Customer OTP must be verified before completing booking",
      );
    }

    const serviceExecutions =
      booking.execution
        .serviceExecutions;

    const allServicesResolved =
      serviceExecutions.length > 0 &&
      serviceExecutions.every(
        (service) =>
          service.status ===
          "COMPLETED" ||
          service.status ===
          "SKIPPED" ||
          service.status ===
          "CANCELLED",
      );

    if (!allServicesResolved) {
      throw new Error(
        "All services must be completed, skipped, or cancelled",
      );
    }

    const cleanProofUrls =
      proofUrls
        .filter(
          (url) =>
            typeof url === "string",
        )
        .map(
          (url) =>
            url.trim(),
        )
        .filter(Boolean);

    if (!cleanProofUrls.length) {
      throw new Error(
        "At least one completion proof is required",
      );
    }

    const now = new Date();

    this.addMilestoneIfMissing(
      booking,
      "ALL_SERVICES_COMPLETED",
      completedBy,
    );

    this.addMilestoneIfMissing(
      booking,
      "FINAL_REPORT_GENERATED",
      completedBy,
      notes?.trim(),
    );

    booking.execution.completion = {
      notes:
        notes?.trim() || "",

      proofUrls: cleanProofUrls,

      completedBy:
        new Types.ObjectId(
          completedBy,
        ),

      completedAt: now,
    };

    booking.status =
      "COMPLETED";

    booking.completedAt = now;

    booking.execution.stage =
      "FINISHED";

    booking.execution.finishedAt =
      now;

    booking.execution
      .progressPercentage = 100;

    await booking.save();

    await User.updateOne(
      {
        _id:
          booking.assignment
            .assignedCoordinatorId,
      },
      {
        $inc: {
          "coordinatorProfile.totalCompletedBookings":
            1,
        },
      },
    );

    return {
      bookingId:
        booking._id,

      bookingReference:
        booking.bookingReference,

      bookingStatus:
        booking.status,

      executionStage:
        booking.execution.stage,

      progressPercentage:
        booking.execution
          .progressPercentage,

      completion:
        booking.execution.completion,

      completedAt:
        booking.completedAt,
    };
  }

  static async generateBookingOtp(params: {
    bookingId: string;
    coordinatorId: string;
  }) {
    const { bookingId, coordinatorId } = params;

    const booking = await Booking.findOne({
      _id: bookingId,
      isDeleted: false,
    }).select("+execution.otpVerification.otpHash");

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status !== "IN_PROGRESS") {
      throw new Error(
        "OTP can be generated only after coordinator arrival",
      );
    }

    if (
      booking.assignment?.assignedCoordinatorId?.toString() !==
      coordinatorId
    ) {
      throw new Error(
        "Only the assigned coordinator can request booking OTP",
      );
    }

    booking.execution ??= {
      stage: "CUSTOMER_VERIFICATION_PENDING",
      serviceExecutions: [],
      milestones: [],
      progressPercentage: 0,
    };

    const now = new Date();
    const previousOtp =
      booking.execution.otpVerification;

    if (previousOtp?.status === "VERIFIED") {
      throw new Error(
        "Booking OTP has already been verified",
      );
    }

    if (
      previousOtp?.lastSentAt &&
      now.getTime() - previousOtp.lastSentAt.getTime() <
      OTP_RESEND_COOLDOWN_MS
    ) {
      const remainingSeconds = Math.ceil(
        (
          OTP_RESEND_COOLDOWN_MS -
          (now.getTime() -
            previousOtp.lastSentAt.getTime())
        ) / 1000,
      );

      throw new Error(
        `Please wait ${remainingSeconds} seconds before requesting another OTP`,
      );
    }

    const resendCount =
      previousOtp?.resendCount ?? 0;

    if (resendCount >= MAX_OTP_RESENDS) {
      throw new Error(
        "Maximum OTP resend limit reached",
      );
    }

    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    booking.execution.otpVerification = {
      status: "PENDING",
      otpHash,
      generatedAt: now,
      expiresAt: new Date(
        now.getTime() + BOOKING_OTP_EXPIRY_MS,
      ),
      attempts: 0,
      resendCount: resendCount + 1,
      lastSentAt: now,
    };

    booking.execution.stage =
      "CUSTOMER_VERIFICATION_PENDING";

    await booking.save();

    /*
     * Send through SMS, WhatsApp, or email.
     */
    // await NotificationService.sendBookingOtp({
    //   phone: booking.customerDetails.phone,
    //   email: booking.customerDetails.email,
    //   otp,
    //   bookingReference: booking.bookingReference,
    // });

    return {
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      expiresAt:
        booking.execution.otpVerification.expiresAt,
      resendAvailableAt: new Date(
        now.getTime() + OTP_RESEND_COOLDOWN_MS,
      ),
      resendCount:
        booking.execution.otpVerification.resendCount,
      remainingResends:
        MAX_OTP_RESENDS -
        (booking.execution.otpVerification.resendCount ?? 0),

      otp
      // ...(process.env.NODE_ENV !== "production" && {
      //   otp,
      // }),
    };
  }
}