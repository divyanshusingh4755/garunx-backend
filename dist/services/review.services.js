import mongoose, { Types, } from "mongoose";
import { Booking } from "../models/booking.model.js";
import { Review, } from "../models/review.model.js";
import { User } from "../models/user.model.js";
export class ReviewService {
    static async adjustRatingAggregate(input) {
        const { revieweeId, direction, ratingDelta, countDelta, session, } = input;
        const reviewee = await User.findById(revieweeId).session(session);
        if (!reviewee) {
            throw new Error("Reviewee not found");
        }
        if (direction === "CUSTOMER_TO_COORDINATOR") {
            if (!reviewee.coordinatorProfile) {
                throw new Error("Coordinator profile not found");
            }
            const currentRatingSum = reviewee.coordinatorProfile.ratingSum ?? 0;
            const currentTotalRatings = reviewee.coordinatorProfile.totalRatings ?? 0;
            const newRatingSum = currentRatingSum + ratingDelta;
            const newTotalRatings = currentTotalRatings + countDelta;
            if (newRatingSum < 0 ||
                newTotalRatings < 0) {
                throw new Error("Invalid coordinator rating aggregate state");
            }
            reviewee.coordinatorProfile.ratingSum =
                newTotalRatings === 0
                    ? 0
                    : newRatingSum;
            reviewee.coordinatorProfile.totalRatings =
                newTotalRatings;
            reviewee.coordinatorProfile.averageRating =
                newTotalRatings > 0
                    ? newRatingSum / newTotalRatings
                    : 0;
            await reviewee.save({
                session,
            });
            return;
        }
        if (direction === "COORDINATOR_TO_CUSTOMER") {
            const currentRatingSum = reviewee.ratingSummary?.ratingSum ?? 0;
            const currentTotalRatings = reviewee.ratingSummary?.totalRatings ?? 0;
            const newRatingSum = currentRatingSum + ratingDelta;
            const newTotalRatings = currentTotalRatings + countDelta;
            if (newRatingSum < 0 ||
                newTotalRatings < 0) {
                throw new Error("Invalid customer rating aggregate state");
            }
            reviewee.ratingSummary = {
                ratingSum: newTotalRatings === 0
                    ? 0
                    : newRatingSum,
                totalRatings: newTotalRatings,
                averageRating: newTotalRatings > 0
                    ? newRatingSum /
                        newTotalRatings
                    : 0,
            };
            await reviewee.save({
                session,
            });
            return;
        }
        throw new Error("Invalid review direction");
    }
    static resolveReviewParticipants(booking, loggedInUserId) {
        const customerId = booking.userId;
        const coordinatorId = booking.assignment?.assignedCoordinatorId;
        if (!customerId) {
            throw new Error("Customer is not associated with this booking");
        }
        if (!coordinatorId) {
            throw new Error("Coordinator is not assigned to this booking");
        }
        if (customerId.equals(loggedInUserId)) {
            return {
                reviewerId: customerId,
                revieweeId: coordinatorId,
                direction: "CUSTOMER_TO_COORDINATOR",
            };
        }
        if (coordinatorId.equals(loggedInUserId)) {
            return {
                reviewerId: coordinatorId,
                revieweeId: customerId,
                direction: "COORDINATOR_TO_CUSTOMER",
            };
        }
        throw new Error("You are not authorized to review this booking");
    }
    ;
    static async getAllReviews(params) {
        const { searchTerm, direction, visibility, moderationStatus, isDeleted, rating, reviewerId, revieweeId, bookingId, limit = 40, page = 1, sortBy = "createdAt", sortOrder = "desc", } = params;
        const skip = (page - 1) * limit;
        const query = {};
        if (direction) {
            query.direction = direction;
        }
        if (visibility) {
            query.visibility = visibility;
        }
        if (moderationStatus) {
            query.moderationStatus =
                moderationStatus;
        }
        if (typeof isDeleted === "boolean") {
            query.isDeleted = isDeleted;
        }
        if (rating !== undefined) {
            query.rating = rating;
        }
        if (reviewerId) {
            if (!Types.ObjectId.isValid(reviewerId)) {
                throw new Error("Invalid reviewer id");
            }
            query.reviewerId =
                new Types.ObjectId(reviewerId);
        }
        if (revieweeId) {
            if (!Types.ObjectId.isValid(revieweeId)) {
                throw new Error("Invalid reviewee id");
            }
            query.revieweeId =
                new Types.ObjectId(revieweeId);
        }
        if (bookingId) {
            if (!Types.ObjectId.isValid(bookingId)) {
                throw new Error("Invalid booking id");
            }
            query.bookingId =
                new Types.ObjectId(bookingId);
        }
        if (searchTerm?.trim()) {
            const term = searchTerm.trim();
            query.review = {
                $regex: term,
                $options: "i",
            };
        }
        const allowedSortFields = [
            "createdAt",
            "updatedAt",
            "rating",
            "editedAt",
        ];
        const safeSortBy = allowedSortFields.includes(sortBy)
            ? sortBy
            : "createdAt";
        const sortCriteria = {
            [safeSortBy]: sortOrder === "asc"
                ? 1
                : -1,
        };
        if (safeSortBy !==
            "createdAt") {
            sortCriteria.createdAt =
                -1;
        }
        try {
            const [data, total] = await Promise.all([
                Review.find(query)
                    .populate("reviewerId", "fullName profileImage role userReference")
                    .populate("revieweeId", "fullName profileImage role userReference")
                    .populate("bookingId", "bookingReference status completedAt")
                    .populate("moderatedBy", "fullName role userReference")
                    .populate("deletedBy", "fullName role userReference")
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Review.countDocuments(query),
            ]);
            return {
                data,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            throw new Error(`Review fetch failed: ${error.message}`);
        }
    }
    static async createReviewService(input) {
        const { bookingId, reviewerId, rating, review, } = input;
        if (!Types.ObjectId.isValid(bookingId)) {
            throw new Error("Invalid booking id");
        }
        if (!Types.ObjectId.isValid(reviewerId)) {
            throw new Error("Invalid reviewer id");
        }
        if (rating < 1 || rating > 5) {
            throw new Error("Rating must be between 1 and 5");
        }
        const bookingObjectId = new Types.ObjectId(bookingId);
        const reviewerObjectId = new Types.ObjectId(reviewerId);
        const session = await mongoose.startSession();
        try {
            let createdReview;
            await session.withTransaction(async () => {
                const booking = await Booking.findOne({
                    _id: bookingObjectId,
                    isDeleted: false,
                }).session(session);
                if (!booking) {
                    throw new Error("Booking not found");
                }
                if (booking.status !== "COMPLETED") {
                    throw new Error("Review can only be submitted after booking completion");
                }
                const { reviewerId: resolvedReviewerId, revieweeId, direction, } = this.resolveReviewParticipants(booking, reviewerObjectId);
                const existingReview = await Review.findOne({
                    bookingId: booking._id,
                    reviewerId: resolvedReviewerId,
                }).session(session);
                if (existingReview) {
                    throw new Error("You have already reviewed this booking");
                }
                const [reviewDocument] = await Review.create([
                    {
                        bookingId: booking._id,
                        reviewerId: resolvedReviewerId,
                        revieweeId,
                        direction,
                        rating,
                        ...(review ? { review } : {}),
                    },
                ], {
                    session,
                });
                if (!reviewDocument) {
                    throw new Error("Failed to create review");
                }
                await this.adjustRatingAggregate({
                    revieweeId,
                    direction,
                    ratingDelta: rating,
                    countDelta: 1,
                    session,
                });
                createdReview = reviewDocument;
            });
            return createdReview;
        }
        finally {
            await session.endSession();
        }
    }
    ;
    static async editReviewService(input) {
        const { reviewId, reviewerId, rating, review, } = input;
        if (!Types.ObjectId.isValid(reviewId)) {
            throw new Error("Invalid review id");
        }
        if (!Types.ObjectId.isValid(reviewerId)) {
            throw new Error("Invalid reviewer id");
        }
        if (rating !== undefined &&
            (rating < 1 || rating > 5)) {
            throw new Error("Rating must be between 1 and 5");
        }
        if (rating === undefined &&
            review === undefined) {
            throw new Error("At least one field is required to update");
        }
        const reviewObjectId = new Types.ObjectId(reviewId);
        const reviewerObjectId = new Types.ObjectId(reviewerId);
        const session = await mongoose.startSession();
        try {
            let updatedReview;
            await session.withTransaction(async () => {
                const reviewDocument = await Review.findOne({
                    _id: reviewObjectId,
                    isDeleted: false,
                }).session(session);
                if (!reviewDocument) {
                    throw new Error("Review not found");
                }
                if (!reviewDocument.reviewerId.equals(reviewerObjectId)) {
                    throw new Error("You are not authorized to edit this review");
                }
                const oldRating = reviewDocument.rating;
                const newRating = rating !== undefined
                    ? rating
                    : oldRating;
                const ratingChanged = newRating !== oldRating;
                if (ratingChanged) {
                    const ratingDelta = newRating - oldRating;
                    const contributesToRating = reviewDocument.visibility ===
                        "PUBLISHED" &&
                        reviewDocument.isDeleted ===
                            false;
                    if (contributesToRating) {
                        await this.adjustRatingAggregate({
                            revieweeId: reviewDocument.revieweeId,
                            direction: reviewDocument.direction,
                            ratingDelta,
                            countDelta: 0,
                            session,
                        });
                    }
                    reviewDocument.rating =
                        newRating;
                }
                if (review !== undefined) {
                    reviewDocument.review =
                        review;
                }
                reviewDocument.editedAt =
                    new Date();
                reviewDocument.editCount =
                    (reviewDocument.editCount ?? 0) +
                        1;
                await reviewDocument.save({
                    session,
                });
                updatedReview =
                    reviewDocument;
            });
            return updatedReview;
        }
        finally {
            await session.endSession();
        }
    }
    static async moderateReviewService(input) {
        const { reviewId, adminId, action, reason, } = input;
        if (!Types.ObjectId.isValid(reviewId)) {
            throw new Error("Invalid review id");
        }
        if (!Types.ObjectId.isValid(adminId)) {
            throw new Error("Invalid admin id");
        }
        const reviewObjectId = new Types.ObjectId(reviewId);
        const adminObjectId = new Types.ObjectId(adminId);
        const session = await mongoose.startSession();
        try {
            let moderatedReview;
            await session.withTransaction(async () => {
                const reviewDocument = await Review.findById(reviewObjectId).session(session);
                if (!reviewDocument) {
                    throw new Error("Review not found");
                }
                if (reviewDocument.isDeleted &&
                    action !== "DELETE") {
                    throw new Error("Deleted review cannot be moderated");
                }
                const wasContributing = reviewDocument.visibility ===
                    "PUBLISHED" &&
                    reviewDocument.isDeleted === false;
                switch (action) {
                    case "HIDE": {
                        if (reviewDocument.visibility ===
                            "HIDDEN") {
                            throw new Error("Review is already hidden");
                        }
                        reviewDocument.visibility =
                            "HIDDEN";
                        break;
                    }
                    case "UNPUBLISH": {
                        if (reviewDocument.visibility ===
                            "UNPUBLISHED") {
                            throw new Error("Review is already unpublished");
                        }
                        reviewDocument.visibility =
                            "UNPUBLISHED";
                        break;
                    }
                    case "PUBLISH": {
                        if (reviewDocument.visibility ===
                            "PUBLISHED") {
                            throw new Error("Review is already published");
                        }
                        if (reviewDocument.isDeleted) {
                            throw new Error("Deleted review cannot be published");
                        }
                        reviewDocument.visibility =
                            "PUBLISHED";
                        break;
                    }
                    case "FLAG": {
                        if (reviewDocument
                            .moderationStatus ===
                            "FLAGGED") {
                            throw new Error("Review is already flagged");
                        }
                        reviewDocument.moderationStatus =
                            "FLAGGED";
                        break;
                    }
                    case "UNFLAG": {
                        if (reviewDocument
                            .moderationStatus ===
                            "CLEAN") {
                            throw new Error("Review is not flagged");
                        }
                        reviewDocument.moderationStatus =
                            "CLEAN";
                        break;
                    }
                    case "DELETE": {
                        if (reviewDocument.isDeleted) {
                            throw new Error("Review is already deleted");
                        }
                        reviewDocument.isDeleted = true;
                        reviewDocument.deletedBy =
                            adminObjectId;
                        reviewDocument.deletedAt =
                            new Date();
                        if (reason !== undefined) {
                            reviewDocument.deletionReason =
                                reason;
                        }
                        break;
                    }
                    default: {
                        throw new Error("Invalid moderation action");
                    }
                }
                const isContributing = reviewDocument.visibility ===
                    "PUBLISHED" &&
                    reviewDocument.isDeleted === false;
                if (wasContributing &&
                    !isContributing) {
                    await this.adjustRatingAggregate({
                        revieweeId: reviewDocument.revieweeId,
                        direction: reviewDocument.direction,
                        ratingDelta: -reviewDocument.rating,
                        countDelta: -1,
                        session,
                    });
                }
                if (!wasContributing &&
                    isContributing) {
                    await this.adjustRatingAggregate({
                        revieweeId: reviewDocument.revieweeId,
                        direction: reviewDocument.direction,
                        ratingDelta: reviewDocument.rating,
                        countDelta: 1,
                        session,
                    });
                }
                if (action !== "DELETE") {
                    reviewDocument.moderatedBy =
                        adminObjectId;
                    reviewDocument.moderatedAt =
                        new Date();
                    if (reason !== undefined) {
                        reviewDocument.moderationReason =
                            reason;
                    }
                }
                await reviewDocument.save({
                    session,
                });
                moderatedReview =
                    reviewDocument;
            });
            return moderatedReview;
        }
        finally {
            await session.endSession();
        }
    }
    static async getMyBookingReview(input) {
        const { bookingId, userId, } = input;
        if (!Types.ObjectId.isValid(bookingId)) {
            throw new Error("Invalid booking id");
        }
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user id");
        }
        const bookingObjectId = new Types.ObjectId(bookingId);
        const userObjectId = new Types.ObjectId(userId);
        const booking = await Booking.findOne({
            _id: bookingObjectId,
            isDeleted: false,
        })
            .select("_id userId status assignment.assignedCoordinatorId bookingReference completedAt")
            .lean();
        if (!booking) {
            throw new Error("Booking not found");
        }
        const customerId = booking.userId;
        const coordinatorId = booking.assignment
            ?.assignedCoordinatorId;
        if (!customerId) {
            throw new Error("Customer is not associated with this booking");
        }
        if (!coordinatorId) {
            throw new Error("Coordinator is not assigned to this booking");
        }
        const isCustomer = customerId.equals(userObjectId);
        const isCoordinator = coordinatorId.equals(userObjectId);
        if (!isCustomer && !isCoordinator) {
            throw new Error("You are not authorized to access review details for this booking");
        }
        const review = await Review.findOne({
            bookingId: bookingObjectId,
            reviewerId: userObjectId,
            isDeleted: false,
        })
            .select("rating review direction visibility moderationStatus editedAt editCount createdAt updatedAt")
            .lean();
        const hasReviewed = !!review;
        const canReview = booking.status === "COMPLETED" &&
            !hasReviewed;
        return {
            booking: {
                _id: booking._id,
                bookingReference: booking.bookingReference,
                status: booking.status,
                completedAt: booking.completedAt,
            },
            role: isCustomer
                ? "CUSTOMER"
                : "COORDINATOR",
            canReview,
            hasReviewed,
            review: review ?? null,
        };
    }
    static async getMyReviews(params) {
        const { userId, rating, direction, limit = 20, page = 1, sortBy = "createdAt", sortOrder = "desc", } = params;
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user id");
        }
        const userObjectId = new Types.ObjectId(userId);
        const skip = (page - 1) * limit;
        const query = {
            reviewerId: userObjectId,
            isDeleted: false,
        };
        if (rating !== undefined) {
            query.rating = rating;
        }
        if (direction) {
            query.direction = direction;
        }
        const allowedSortFields = [
            "createdAt",
            "updatedAt",
            "rating",
            "editedAt",
        ];
        const safeSortBy = allowedSortFields.includes(sortBy)
            ? sortBy
            : "createdAt";
        const sortCriteria = {
            [safeSortBy]: sortOrder === "asc"
                ? 1
                : -1,
        };
        if (safeSortBy !== "createdAt") {
            sortCriteria.createdAt = -1;
        }
        try {
            const [data, total] = await Promise.all([
                Review.find(query)
                    .populate("revieweeId", "fullName profileImage role userReference")
                    .populate("bookingId", "bookingReference status completedAt scheduledAt")
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Review.countDocuments(query),
            ]);
            return {
                data,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            throw new Error(`My reviews fetch failed: ${error.message}`);
        }
    }
    static async getCoordinatorReviews(params) {
        const { coordinatorId, rating, limit = 20, page = 1, sortBy = "createdAt", sortOrder = "desc", } = params;
        if (!Types.ObjectId.isValid(coordinatorId)) {
            throw new Error("Invalid coordinator id");
        }
        const coordinatorObjectId = new Types.ObjectId(coordinatorId);
        const skip = (page - 1) * limit;
        const coordinator = await User.findById(coordinatorObjectId)
            .select("fullName profileImage role userReference coordinatorProfile.averageRating coordinatorProfile.totalRatings")
            .lean();
        if (!coordinator) {
            throw new Error("Coordinator not found");
        }
        if (!coordinator.coordinatorProfile) {
            throw new Error("Coordinator profile not found");
        }
        const query = {
            revieweeId: coordinatorObjectId,
            direction: "CUSTOMER_TO_COORDINATOR",
            visibility: "PUBLISHED",
            isDeleted: false,
        };
        if (rating !== undefined) {
            query.rating = rating;
        }
        const allowedSortFields = [
            "createdAt",
            "updatedAt",
            "rating",
            "editedAt",
        ];
        const safeSortBy = allowedSortFields.includes(sortBy)
            ? sortBy
            : "createdAt";
        const sortCriteria = {
            [safeSortBy]: sortOrder === "asc"
                ? 1
                : -1,
        };
        if (safeSortBy !==
            "createdAt") {
            sortCriteria.createdAt =
                -1;
        }
        try {
            const [data, total] = await Promise.all([
                Review.find(query)
                    .populate("reviewerId", "fullName profileImage userReference")
                    .populate("bookingId", "bookingReference completedAt")
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Review.countDocuments(query),
            ]);
            return {
                coordinator: {
                    _id: coordinator._id,
                    fullName: coordinator.fullName,
                    profileImage: coordinator.profileImage,
                    userReference: coordinator.userReference,
                    averageRating: coordinator
                        .coordinatorProfile
                        .averageRating,
                    totalRatings: coordinator
                        .coordinatorProfile
                        .totalRatings,
                },
                data,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            throw new Error(`Coordinator reviews fetch failed: ${error.message}`);
        }
    }
}
//# sourceMappingURL=review.services.js.map