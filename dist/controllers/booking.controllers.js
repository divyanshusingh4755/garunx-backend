import { BookingService } from "../services/booking.service.js";
import { mapRoleToReassignmentRole } from "../utils/mapRole.js";
export const paymentWebhooks = async (req, res) => {
    try {
        await BookingService.process(req);
        return res.status(200).json({
            success: true,
        });
    }
    catch (error) {
        console.error("Cashfree webhook error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Payment webhook processing failed",
        });
    }
};
export const retryPayment = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required",
            });
        }
        const result = await BookingService.retryPayment(bookingId, userId);
        return res.status(200).json({
            success: true,
            message: "Payment session generated successfully",
            data: result,
        });
    }
    catch (error) {
        console.error("Retry payment error:", error);
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to retry payment",
        });
    }
};
export const paymentStatus = async (req, res) => {
    try {
        const { cartId } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        if (!cartId) {
            return res.status(400).json({
                success: false,
                message: "Cart ID is required",
            });
        }
        const result = await BookingService.getPaymentStatus(cartId, userId);
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error("Payment status error:", error);
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch payment status",
        });
    }
};
export const getAllBookings = async (req, res) => {
    try {
        const { searchTerm, status, paymentStatus, userId, bookingReference, fromDate, toDate, limit, page, sortBy, sortOrder, } = req.query;
        const result = await BookingService.findBookings({
            searchTerm: searchTerm,
            status: status,
            paymentStatus: paymentStatus,
            userId: userId,
            bookingReference: bookingReference,
            fromDate: fromDate,
            toDate: toDate,
            limit: Number(limit) || 20,
            page: Number(page) || 1,
            sortBy: sortBy || "createdAt",
            sortOrder: sortOrder || "desc",
        });
        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            currentPage: result.page,
            totalPages: result.totalPages,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getBookingById = async (req, res) => {
    try {
        const { bookingId } = req.params;
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required",
            });
        }
        const result = await BookingService.getBookingById(bookingId);
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch booking",
        });
    }
};
export const getBookingStats = async (req, res) => {
    try {
        const result = await BookingService.getBookingStats();
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const searchBookings = async (req, res) => {
    try {
        const { query } = req.query;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!query) {
            return res.status(400).json({
                success: false,
                message: "Search query (email or phone) is required",
            });
        }
        const result = await BookingService.searchBookings(query);
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const updateBookingNotes = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { notes } = req.body;
        const result = await BookingService.updateBookingNotes(bookingId, notes);
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const rescheduleBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { scheduledAt, reason, } = req.body;
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!userId || !role) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!bookingId ||
            Array.isArray(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required",
            });
        }
        if (!scheduledAt) {
            return res.status(400).json({
                success: false,
                message: "New scheduled date is required",
            });
        }
        if (typeof reason !== "string" ||
            !reason.trim()) {
            return res.status(400).json({
                success: false,
                message: "Reschedule reason is required",
            });
        }
        const result = await BookingService.rescheduleBooking({
            bookingId,
            scheduledAt,
            reason: reason.trim(),
            userId,
            role,
        });
        return res.status(200).json({
            success: true,
            message: result.message,
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message ||
                "Failed to reschedule booking",
        });
    }
};
export const updateBookingStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status, reason } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const result = await BookingService.updateBookingStatus(bookingId, status, userId, req.user.role, reason);
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const refundBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { amount, reason } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const result = await BookingService.refundBooking(bookingId, Number(amount), reason, userId);
        return res.status(200).json({
            success: true,
            message: "Refund processed successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const expirePayments = async (req, res) => {
    try {
        const result = await BookingService.expirePendingPayments();
        return res.status(200).json({
            success: true,
            message: `${result.expiredBookings} bookings expired`,
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getMyBookings = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const { status, page, limit, sortBy, sortOrder, } = req.query;
        const result = await BookingService.getMyBookings({
            userId,
            status: status,
            page: Number(page) || 1,
            limit: Number(limit) || 20,
            sortBy: sortBy || "createdAt",
            sortOrder: sortOrder || "desc",
        });
        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            currentPage: result.page,
            totalPages: result.totalPages,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getMyBookingById = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const result = await BookingService.getMyBookingById(bookingId, userId);
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { reason } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const result = await BookingService.cancelBooking(bookingId, userId, req.user.role, reason);
        return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
/**
 * Get coordinators eligible for a specific booking.
 */
export const getAvailableCoordinators = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required",
            });
        }
        if (!bookingId || Array.isArray(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required",
            });
        }
        const { matchCaste, matchGotra, minRating, minCompletedBookings, autoAssignmentEnabled, sortBy, sortOrder, scheduledAt, } = req.query;
        const filters = {};
        if (matchCaste === "true" ||
            matchCaste === "false") {
            filters.matchCaste =
                matchCaste === "true";
        }
        if (matchGotra === "true" ||
            matchGotra === "false") {
            filters.matchGotra =
                matchGotra === "true";
        }
        if (typeof minRating === "string") {
            const value = Number(minRating);
            if (!Number.isNaN(value)) {
                filters.minRating = value;
            }
        }
        if (typeof minCompletedBookings ===
            "string") {
            const value = Number(minCompletedBookings);
            if (!Number.isNaN(value)) {
                filters.minCompletedBookings =
                    value;
            }
        }
        if (autoAssignmentEnabled === "true" ||
            autoAssignmentEnabled === "false") {
            filters.autoAssignmentEnabled =
                autoAssignmentEnabled === "true";
        }
        if (sortBy === "rating" ||
            sortBy === "completedBookings" ||
            sortBy === "acceptanceRate") {
            filters.sortBy = sortBy;
        }
        if (sortOrder === "asc" ||
            sortOrder === "desc") {
            filters.sortOrder = sortOrder;
        }
        if (typeof scheduledAt === "string") {
            filters.scheduledAt =
                scheduledAt;
        }
        const result = await BookingService.getAvailableCoordinators(bookingId, userId, filters);
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message ||
                "Failed to fetch available coordinators",
        });
    }
};
/**
 * Customer selects a coordinator for the booking.
 */
export const selectCoordinator = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { coordinatorId, scheduledAt, rescheduleReason, } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required",
            });
        }
        if (!coordinatorId) {
            return res.status(400).json({
                success: false,
                message: "Coordinator ID is required",
            });
        }
        if (!bookingId || Array.isArray(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required",
            });
        }
        if (scheduledAt &&
            (typeof rescheduleReason !== "string" ||
                !rescheduleReason.trim())) {
            return res.status(400).json({
                success: false,
                message: "Reschedule reason is required when selecting coordinator for a new date",
            });
        }
        const result = await BookingService.selectCoordinator({
            bookingId,
            coordinatorId,
            selectedBy: userId,
            assignmentType: "MANUAL",
            ...(scheduledAt && {
                scheduledAt,
            }),
            ...(rescheduleReason && {
                rescheduleReason,
            }),
        });
        return res.status(200).json({
            success: true,
            message: "Booking request sent to coordinator",
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to select coordinator",
        });
    }
};
/**
 * Coordinator accepts or rejects the assignment request.
 */
export const respondToAssignment = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { action, reason } = req.body;
        const coordinatorId = req.user?.userId;
        if (!coordinatorId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required",
            });
        }
        if (!["ACCEPT", "REJECT"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Action must be ACCEPT or REJECT",
            });
        }
        if (!bookingId || Array.isArray(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required",
            });
        }
        const result = await BookingService.respondToAssignment({
            bookingId,
            coordinatorId,
            action,
            reason,
        });
        return res.status(200).json({
            success: true,
            message: action === "ACCEPT"
                ? "Booking accepted successfully"
                : "Booking rejected successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to respond to assignment",
        });
    }
};
/**
 * Customer or coordinator requests reassignment.
 */
export const requestReassignment = async (req, res) => {
    try {
        const bookingId = req.params.bookingId;
        const { reason } = req.body;
        const requestedBy = req.user?.userId;
        const authenticatedRole = req.user?.role;
        if (!requestedBy || !authenticatedRole) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required",
            });
        }
        if (!bookingId || Array.isArray(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required",
            });
        }
        if (typeof reason !== "string" ||
            !reason.trim()) {
            return res.status(400).json({
                success: false,
                message: "Reassignment reason is required",
            });
        }
        const requestedByRole = mapRoleToReassignmentRole(authenticatedRole);
        const result = await BookingService.requestReassignment({
            bookingId,
            requestedBy,
            requestedByRole,
            reason: reason.trim(),
        });
        return res.status(200).json({
            success: true,
            message: "Reassignment requested successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to request reassignment",
        });
    }
};
/**
 * Pending assignment requests visible to a coordinator.
 */
export const getCoordinatorAssignmentRequests = async (req, res) => {
    try {
        const coordinatorId = req.user?.userId;
        if (!coordinatorId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const { page, limit, sortOrder } = req.query;
        const result = await BookingService.getCoordinatorAssignmentRequests({
            coordinatorId,
            page: Number(page) || 1,
            limit: Number(limit) || 20,
            sortOrder: sortOrder || "desc",
        });
        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            currentPage: result.page,
            totalPages: result.totalPages,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch coordinator assignment requests",
        });
    }
};
/**
 * Accepted, ongoing, and completed bookings of a coordinator.
 */
export const getCoordinatorBookings = async (req, res) => {
    try {
        const coordinatorId = req.user?.userId;
        if (!coordinatorId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const { status, page, limit, sortBy, sortOrder } = req.query;
        const result = await BookingService.getCoordinatorBookings({
            coordinatorId,
            status: status,
            page: Number(page) || 1,
            limit: Number(limit) || 20,
            sortBy: sortBy || "scheduledAt",
            sortOrder: sortOrder || "asc",
        });
        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            currentPage: result.page,
            totalPages: result.totalPages,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch coordinator bookings",
        });
    }
};
/**
 * Process coordinators who did not respond before their deadline.
 */
export const processAssignmentTimeouts = async (req, res) => {
    try {
        const result = await BookingService.processAssignmentTimeouts();
        return res.status(200).json({
            success: true,
            message: "Assignment timeouts processed successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to process assignment timeouts",
        });
    }
};
/**
 * Return only the operational execution details of a booking.
 */
export const getBookingExecution = async (req, res) => {
    try {
        const { bookingId } = req.params;
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required",
            });
        }
        if (!bookingId || Array.isArray(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required",
            });
        }
        const result = await BookingService.getBookingExecution(bookingId);
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch booking execution",
        });
    }
};
/**
 * Coordinator marks arrival at the service location.
 */
export const markCoordinatorArrived = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const coordinatorId = req.user?.userId;
        if (!coordinatorId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required",
            });
        }
        if (!bookingId || Array.isArray(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required",
            });
        }
        const result = await BookingService.markCoordinatorArrived({
            bookingId,
            coordinatorId,
        });
        return res.status(200).json({
            success: true,
            message: "Coordinator arrival recorded successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to mark coordinator arrival",
        });
    }
};
/**
 * Verify the customer OTP before beginning service execution.
 */
export const verifyBookingOtp = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { otp } = req.body;
        const verifiedBy = req.user?.userId;
        if (!verifiedBy) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!otp) {
            return res.status(400).json({
                success: false,
                message: "OTP is required",
            });
        }
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required",
            });
        }
        if (!bookingId || Array.isArray(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required",
            });
        }
        const result = await BookingService.verifyBookingOtp({
            bookingId,
            otp: String(otp),
            verifiedBy,
        });
        return res.status(200).json({
            success: true,
            message: "Booking OTP verified successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to verify booking OTP",
        });
    }
};
/**
 * Start one service execution.
 */
export const startBookingService = async (req, res) => {
    try {
        const { bookingId, executionId } = req.params;
        const startedBy = req.user?.userId;
        if (!startedBy) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required",
            });
        }
        if (!bookingId || Array.isArray(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required",
            });
        }
        if (!executionId || Array.isArray(executionId)) {
            return res.status(400).json({
                success: false,
                message: "Valid execution ID is required",
            });
        }
        const result = await BookingService.startBookingService({
            bookingId,
            executionId,
            startedBy,
        });
        return res.status(200).json({
            success: true,
            message: "Service execution started",
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to start service execution",
        });
    }
};
/**
 * Complete one service execution.
 */
export const completeBookingService = async (req, res) => {
    try {
        const { bookingId, executionId } = req.params;
        const { notes } = req.body;
        const completedBy = req.user?.userId;
        if (!completedBy) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required",
            });
        }
        if (!bookingId || Array.isArray(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required",
            });
        }
        if (!executionId || Array.isArray(executionId)) {
            return res.status(400).json({
                success: false,
                message: "Valid execution ID is required",
            });
        }
        const result = await BookingService.completeBookingService({
            bookingId,
            executionId,
            completedBy,
            notes,
        });
        return res.status(200).json({
            success: true,
            message: "Service execution completed",
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to complete service execution",
        });
    }
};
/**
 * Skip one service execution.
 */
export const skipBookingService = async (req, res) => {
    try {
        const bookingId = req.params.bookingId;
        const executionId = req.params.executionId;
        const { reason } = req.body;
        const skippedBy = req.user?.userId;
        if (!skippedBy) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required",
            });
        }
        if (!bookingId || Array.isArray(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required",
            });
        }
        if (!executionId || Array.isArray(executionId)) {
            return res.status(400).json({
                success: false,
                message: "Valid execution ID is required",
            });
        }
        if (typeof reason !== "string" ||
            !reason.trim()) {
            return res.status(400).json({
                success: false,
                message: "Skip reason is required",
            });
        }
        const result = await BookingService.skipBookingService({
            bookingId,
            executionId,
            skippedBy,
            reason: reason.trim(),
        });
        return res.status(200).json({
            success: true,
            message: "Service execution skipped",
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to skip service execution",
        });
    }
};
/**
 * Add a completed milestone to booking execution.
 */
export const addBookingMilestone = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { code, notes } = req.body;
        const completedBy = req.user?.userId;
        if (!completedBy) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Milestone code is required",
            });
        }
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required",
            });
        }
        if (!bookingId || Array.isArray(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required",
            });
        }
        const result = await BookingService.addBookingMilestone({
            bookingId,
            code,
            notes,
            completedBy,
        });
        return res.status(200).json({
            success: true,
            message: "Booking milestone completed",
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to add booking milestone",
        });
    }
};
/**
 * Complete the complete booking execution workflow.
 */
export const completeBookingExecution = async (req, res) => {
    try {
        const bookingId = req.params.bookingId;
        const { notes, proofUrls, } = req.body;
        const completedBy = req.user?.userId;
        if (!completedBy) {
            return res
                .status(401)
                .json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!bookingId ||
            Array.isArray(bookingId)) {
            return res
                .status(400)
                .json({
                success: false,
                message: "Valid booking ID is required",
            });
        }
        if (!Array.isArray(proofUrls) ||
            proofUrls.length === 0) {
            return res
                .status(400)
                .json({
                success: false,
                message: "At least one completion proof is required",
            });
        }
        const result = await BookingService
            .completeBookingExecution({
            bookingId,
            completedBy,
            notes,
            proofUrls,
        });
        return res.status(200).json({
            success: true,
            message: "Booking completed successfully",
            data: result,
        });
    }
    catch (error) {
        return res
            .status(400)
            .json({
            success: false,
            message: error.message ||
                "Failed to complete booking",
        });
    }
};
export const generateBookingOtp = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const coordinatorId = req.user?.userId;
        if (!coordinatorId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!bookingId ||
            Array.isArray(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required",
            });
        }
        const result = await BookingService.generateBookingOtp({
            bookingId,
            coordinatorId,
        });
        return res.status(200).json({
            success: true,
            message: "Booking OTP sent successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message ||
                "Failed to generate booking OTP",
        });
    }
};
//# sourceMappingURL=booking.controllers.js.map