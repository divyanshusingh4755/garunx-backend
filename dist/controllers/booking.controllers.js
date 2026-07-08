import { BookingService } from "../services/booking.service.js";
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
export const updateBookingSchedule = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { scheduledAt } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const result = await BookingService.updateBookingSchedule(bookingId, scheduledAt, userId, req.user.role);
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
//# sourceMappingURL=booking.controllers.js.map