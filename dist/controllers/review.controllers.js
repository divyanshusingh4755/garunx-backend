import { ReviewService, } from "../services/review.services.js";
const getErrorMessage = (error, fallback) => error instanceof Error
    ? error.message
    : fallback;
const getErrorStatus = (error) => {
    if (!(error instanceof Error)) {
        return 400;
    }
    if (error.message.includes("not found")) {
        return 404;
    }
    if (error.message.includes("not authorized")) {
        return 403;
    }
    if (error.message.includes("already reviewed") ||
        error.message.includes("already exists")) {
        return 409;
    }
    return 400;
};
const parsePositiveInteger = (value, fallback, maximum) => {
    const parsed = typeof value === "number"
        ? value
        : Number(value);
    if (!Number.isInteger(parsed) ||
        parsed < 1) {
        return fallback;
    }
    return maximum
        ? Math.min(parsed, maximum)
        : parsed;
};
export const getAllReviews = async (req, res) => {
    try {
        const { searchTerm, direction, visibility, moderationStatus, isDeleted, rating, reviewerId, revieweeId, bookingId, limit, page, sortBy, sortOrder, } = req.query;
        const params = {
            limit: parsePositiveInteger(limit, 40, 100),
            page: parsePositiveInteger(page, 1),
            sortBy: typeof sortBy === "string"
                ? sortBy
                : "createdAt",
            sortOrder: sortOrder === "asc"
                ? "asc"
                : "desc",
        };
        if (typeof searchTerm === "string") {
            params.searchTerm = searchTerm;
        }
        if (typeof direction === "string") {
            params.direction =
                direction;
        }
        if (typeof visibility === "string") {
            params.visibility =
                visibility;
        }
        if (typeof moderationStatus === "string") {
            params.moderationStatus =
                moderationStatus;
        }
        if (isDeleted === "true") {
            params.isDeleted = true;
        }
        else if (isDeleted === "false") {
            params.isDeleted = false;
        }
        if (rating !== undefined) {
            params.rating = Number(rating);
        }
        if (typeof reviewerId === "string") {
            params.reviewerId = reviewerId;
        }
        if (typeof revieweeId === "string") {
            params.revieweeId = revieweeId;
        }
        if (typeof bookingId === "string") {
            params.bookingId = bookingId;
        }
        const result = await ReviewService.getAllReviews(params);
        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            currentPage: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        });
    }
    catch (error) {
        return res
            .status(getErrorStatus(error))
            .json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch reviews"),
        });
    }
};
export const createReview = async (req, res) => {
    try {
        const reviewerId = req.user?.userId;
        if (!reviewerId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const input = {
            bookingId: req.params.bookingId,
            reviewerId: reviewerId.toString(),
            rating: req.body.rating,
        };
        if (Object.prototype.hasOwnProperty.call(req.body, "review")) {
            input.review = req.body.review;
        }
        if (Object.prototype.hasOwnProperty.call(req.body, "imageUrl")) {
            input.imageUrl = req.body.imageUrl;
        }
        const createdReview = await ReviewService
            .createReviewService(input);
        return res.status(201).json({
            success: true,
            message: "Review submitted successfully",
            review: createdReview,
        });
    }
    catch (error) {
        return res
            .status(getErrorStatus(error))
            .json({
            success: false,
            message: getErrorMessage(error, "Failed to submit review"),
        });
    }
};
export const editReview = async (req, res) => {
    try {
        const reviewerId = req.user?.userId;
        if (!reviewerId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const input = {
            reviewId: req.params.reviewId,
            reviewerId: reviewerId.toString(),
        };
        if (Object.prototype.hasOwnProperty.call(req.body, "rating")) {
            input.rating = req.body.rating;
        }
        if (Object.prototype.hasOwnProperty.call(req.body, "review")) {
            input.review = req.body.review;
        }
        if (Object.prototype.hasOwnProperty.call(req.body, "imageUrl")) {
            input.imageUrl = req.body.imageUrl;
        }
        const updatedReview = await ReviewService
            .editReviewService(input);
        return res.status(200).json({
            success: true,
            message: "Review updated successfully",
            review: updatedReview,
        });
    }
    catch (error) {
        return res
            .status(getErrorStatus(error))
            .json({
            success: false,
            message: getErrorMessage(error, "Failed to update review"),
        });
    }
};
export const moderateReview = async (req, res) => {
    try {
        const adminId = req.user?.userId;
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const input = {
            reviewId: req.params.reviewId,
            adminId: adminId.toString(),
            action: req.body.action,
        };
        if (Object.prototype.hasOwnProperty.call(req.body, "reason")) {
            input.reason = req.body.reason;
        }
        const moderatedReview = await ReviewService
            .moderateReviewService(input);
        return res.status(200).json({
            success: true,
            message: "Review moderated successfully",
            review: moderatedReview,
        });
    }
    catch (error) {
        return res
            .status(getErrorStatus(error))
            .json({
            success: false,
            message: getErrorMessage(error, "Failed to moderate review"),
        });
    }
};
export const getMyBookingReview = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const result = await ReviewService
            .getMyBookingReview({
            bookingId: req.params.bookingId,
            userId: userId.toString(),
        });
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res
            .status(getErrorStatus(error))
            .json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch review"),
        });
    }
};
export const getMyReviews = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const params = {
            userId: userId.toString(),
            limit: parsePositiveInteger(req.query.limit, 20, 100),
            page: parsePositiveInteger(req.query.page, 1),
            sortBy: typeof req.query.sortBy ===
                "string"
                ? req.query.sortBy
                : "createdAt",
            sortOrder: req.query.sortOrder === "asc"
                ? "asc"
                : "desc",
        };
        if (req.query.rating !== undefined) {
            params.rating =
                Number(req.query.rating);
        }
        if (typeof req.query.direction ===
            "string") {
            params.direction =
                req.query.direction;
        }
        const result = await ReviewService.getMyReviews(params);
        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            currentPage: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        });
    }
    catch (error) {
        return res
            .status(getErrorStatus(error))
            .json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch reviews"),
        });
    }
};
export const getCoordinatorReviews = async (req, res) => {
    try {
        const params = {
            coordinatorId: req.params.coordinatorId,
            limit: parsePositiveInteger(req.query.limit, 20, 100),
            page: parsePositiveInteger(req.query.page, 1),
            sortBy: typeof req.query.sortBy ===
                "string"
                ? req.query.sortBy
                : "createdAt",
            sortOrder: req.query.sortOrder === "asc"
                ? "asc"
                : "desc",
        };
        if (req.query.rating !== undefined) {
            params.rating =
                Number(req.query.rating);
        }
        const result = await ReviewService
            .getCoordinatorReviews(params);
        return res.status(200).json({
            success: true,
            coordinator: result.coordinator,
            data: result.data,
            total: result.total,
            currentPage: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        });
    }
    catch (error) {
        return res
            .status(getErrorStatus(error))
            .json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch coordinator reviews"),
        });
    }
};
//# sourceMappingURL=review.controllers.js.map