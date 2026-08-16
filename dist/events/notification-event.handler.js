import { Types, } from "mongoose";
import { DOMAIN_EVENTS, } from "./domain-events.js";
import { NotificationService, } from "../services/notification.service.js";
import { Role, } from "../types/rbac.js";
export class NotificationEventHandler {
    static requireDate(payload, key) {
        const value = payload[key];
        if (value === undefined ||
            value === null) {
            throw new Error(`${key} missing in notification event`);
        }
        const parsed = new Date(String(value));
        if (Number.isNaN(parsed.getTime())) {
            throw new Error(`Invalid ${key} in notification event`);
        }
        return parsed;
    }
    static async handle(params) {
        const { eventId, eventType, payload, } = params;
        switch (eventType) {
            case DOMAIN_EVENTS.BOOKING_CONFIRMED:
                return this.handleBookingConfirmed({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.BOOKING_ASSIGNMENT_REQUESTED:
                return this.handleBookingAssignmentRequested({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.BOOKING_ASSIGNED:
                return this.handleBookingAssigned({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.BOOKING_RESCHEDULED:
                return this.handleBookingRescheduled({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.BOOKING_CANCELLED:
                return this.handleBookingCancelled({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.BOOKING_STARTED:
                return this.handleBookingStarted({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.BOOKING_COMPLETED:
                return this.handleBookingCompleted({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.FAMILY_TREE_MEMBER_ADDED:
                return this.handleFamilyTreeMemberAdded({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.FAMILY_TREE_MEMBER_UPDATED:
                return this.handleFamilyTreeMemberUpdated({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.FAMILY_TREE_MEMBER_DELETED:
                return this.handleFamilyTreeMemberDeleted({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.FAMILY_TREE_MEMBER_RESTORED:
                return this.handleFamilyTreeMemberRestored({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.REVIEW_CREATED:
                return this.handleReviewCreated({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.REVIEW_REMOVED_BY_ADMIN:
                return this.handleReviewRemovedByAdmin({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.QUERY_ADMIN_REPLIED:
                return this.handleQueryAdminReplied({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.QUERY_REQUESTER_REPLIED:
                return this.handleQueryRequesterReplied({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.QUERY_ASSIGNED:
                return this.handleQueryAssigned({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.QUERY_RESOLVED:
                return this.handleQueryResolved({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.QUERY_REJECTED:
                return this.handleQueryRejected({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.QUERY_REOPENED:
                return this.handleQueryReopened({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.QUERY_DELETED:
                return this.handleQueryDeleted({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.PAYMENT_FAILED:
                return this.handlePaymentFailed({
                    eventId,
                    payload,
                });
            case DOMAIN_EVENTS.PAYMENT_REFUNDED:
                return this.handlePaymentRefunded({
                    eventId,
                    payload,
                });
            /*
             * PAYMENT_SUCCESS is intentionally not mapped
             * to another end-user notification right now.
             *
             * Successful payment already emits
             * BOOKING_CONFIRMED, avoiding duplicate
             * "payment successful" + "booking confirmed"
             * notifications for the same action.
             */
            case DOMAIN_EVENTS.PAYMENT_SUCCESS:
                return {
                    handled: true,
                    notificationCreated: false,
                };
            default:
                throw new Error(`No notification handler registered for event ${eventType}`);
        }
    }
    static requireObjectId(payload, key) {
        const value = payload[key];
        if (typeof value !==
            "string" ||
            !Types.ObjectId.isValid(value)) {
            throw new Error(`Invalid ${key} in notification event`);
        }
        return value;
    }
    static optionalObjectId(payload, key) {
        const value = payload[key];
        if (value ===
            undefined ||
            value ===
                null) {
            return undefined;
        }
        if (typeof value !==
            "string" ||
            !Types.ObjectId.isValid(value)) {
            throw new Error(`Invalid ${key} in notification event`);
        }
        return value;
    }
    static requireString(payload, key) {
        const value = payload[key];
        if (typeof value !==
            "string" ||
            !value.trim()) {
            throw new Error(`${key} missing in notification event`);
        }
        return value.trim();
    }
    static optionalDate(payload, key) {
        const value = payload[key];
        if (value ===
            undefined ||
            value ===
                null) {
            return undefined;
        }
        const parsed = new Date(String(value));
        if (Number.isNaN(parsed.getTime())) {
            throw new Error(`Invalid ${key} in notification event`);
        }
        return parsed;
    }
    static async handleBookingConfirmed(params) {
        const { eventId, payload, } = params;
        const bookingId = this.requireObjectId(payload, "bookingId");
        const userId = this.requireObjectId(payload, "userId");
        const bookingReference = this.requireString(payload, "bookingReference");
        const scheduledAt = this.requireDate(payload, "scheduledAt");
        return NotificationService
            .createFromTemplate({
            recipientId: userId,
            recipientRole: Role.USER,
            templateCode: "BOOKING_CONFIRMED",
            variables: {
                bookingReference,
                scheduledAt,
            },
            referenceId: bookingId,
            dedupeKey: `OUTBOX-${eventId}-USER-${userId}`,
            channels: {
                email: true,
                push: true,
            },
        });
    }
    static async handleBookingAssignmentRequested(params) {
        const { eventId, payload, } = params;
        const bookingId = this.requireObjectId(payload, "bookingId");
        const coordinatorId = this.requireObjectId(payload, "coordinatorId");
        const bookingReference = this.requireString(payload, "bookingReference");
        const scheduledAt = this.requireDate(payload, "scheduledAt");
        const responseDeadlineAt = this.requireDate(payload, "responseDeadlineAt");
        return NotificationService
            .createFromTemplate({
            recipientId: coordinatorId,
            recipientRole: Role.COORDINATOR,
            templateCode: "BOOKING_ASSIGNMENT_REQUESTED",
            variables: {
                bookingReference,
                scheduledAt,
                responseDeadlineAt,
            },
            referenceId: bookingId,
            dedupeKey: `OUTBOX-${eventId}-COORDINATOR-${coordinatorId}`,
            channels: {
                email: true,
                push: true,
            },
        });
    }
    static async handleBookingAssigned(params) {
        const { eventId, payload, } = params;
        const bookingId = this.requireObjectId(payload, "bookingId");
        const userId = this.requireObjectId(payload, "userId");
        const bookingReference = this.requireString(payload, "bookingReference");
        const scheduledAt = this.requireDate(payload, "scheduledAt");
        return NotificationService
            .createFromTemplate({
            recipientId: userId,
            recipientRole: Role.USER,
            templateCode: "BOOKING_ASSIGNED",
            variables: {
                bookingReference,
                scheduledAt,
            },
            referenceId: bookingId,
            dedupeKey: `OUTBOX-${eventId}-USER-${userId}`,
            channels: {
                email: true,
                push: true,
            },
        });
    }
    static async handleBookingRescheduled(params) {
        const { eventId, payload, } = params;
        const bookingId = this.requireObjectId(payload, "bookingId");
        const userId = this.requireObjectId(payload, "userId");
        const coordinatorId = this.optionalObjectId(payload, "coordinatorId");
        const bookingReference = this.requireString(payload, "bookingReference");
        const scheduledAt = this.optionalDate(payload, "scheduledAt");
        if (!scheduledAt) {
            throw new Error("scheduledAt missing in BOOKING.RESCHEDULED event");
        }
        const previousScheduledAt = this.optionalDate(payload, "previousScheduledAt");
        const reason = this.requireString(payload, "reason");
        const jobs = [
            NotificationService
                .createFromTemplate({
                recipientId: userId,
                recipientRole: Role.USER,
                templateCode: "BOOKING_RESCHEDULED",
                variables: {
                    bookingReference,
                    scheduledAt,
                    reason,
                    ...(previousScheduledAt
                        ? {
                            previousScheduledAt,
                        }
                        : {}),
                },
                referenceId: bookingId,
                dedupeKey: `OUTBOX-${eventId}-USER-${userId}`,
                channels: {
                    email: true,
                    push: true,
                },
            }),
        ];
        if (coordinatorId &&
            coordinatorId !==
                userId) {
            jobs.push(NotificationService
                .createFromTemplate({
                recipientId: coordinatorId,
                recipientRole: Role.COORDINATOR,
                templateCode: "COORDINATOR_BOOKING_RESCHEDULED",
                variables: {
                    bookingReference,
                    scheduledAt,
                    reason,
                    ...(previousScheduledAt
                        ? {
                            previousScheduledAt,
                        }
                        : {}),
                },
                referenceId: bookingId,
                dedupeKey: `OUTBOX-${eventId}-COORDINATOR-${coordinatorId}`,
                channels: {
                    email: true,
                    push: true,
                },
            }));
        }
        return Promise.all(jobs);
    }
    static async handleBookingCancelled(params) {
        const { eventId, payload, } = params;
        const bookingId = this.requireObjectId(payload, "bookingId");
        const userId = this.requireObjectId(payload, "userId");
        const coordinatorId = this.optionalObjectId(payload, "coordinatorId");
        const bookingReference = this.requireString(payload, "bookingReference");
        const reason = this.requireString(payload, "reason");
        const jobs = [
            NotificationService
                .createFromTemplate({
                recipientId: userId,
                recipientRole: Role.USER,
                templateCode: "BOOKING_CANCELLED",
                variables: {
                    bookingReference,
                    reason,
                },
                referenceId: bookingId,
                dedupeKey: `OUTBOX-${eventId}-USER-${userId}`,
                channels: {
                    email: true,
                    push: true,
                },
            }),
        ];
        if (coordinatorId) {
            jobs.push(NotificationService
                .createFromTemplate({
                recipientId: coordinatorId,
                recipientRole: Role.COORDINATOR,
                templateCode: "COORDINATOR_BOOKING_CANCELLED",
                variables: {
                    bookingReference,
                    reason,
                },
                referenceId: bookingId,
                dedupeKey: `OUTBOX-${eventId}-COORDINATOR-${coordinatorId}`,
                channels: {
                    email: true,
                    push: true,
                },
            }));
        }
        return Promise.all(jobs);
    }
    static async handleBookingStarted(params) {
        const { eventId, payload, } = params;
        const bookingId = this.requireObjectId(payload, "bookingId");
        const userId = this.requireObjectId(payload, "userId");
        const bookingReference = this.requireString(payload, "bookingReference");
        const startedAt = this.optionalDate(payload, "startedAt");
        return NotificationService
            .createFromTemplate({
            recipientId: userId,
            recipientRole: Role.USER,
            templateCode: "BOOKING_STARTED",
            variables: {
                bookingReference,
                ...(startedAt
                    ? {
                        startedAt,
                    }
                    : {}),
            },
            referenceId: bookingId,
            dedupeKey: `OUTBOX-${eventId}-USER-${userId}`,
            channels: {
                email: false,
                push: true,
            },
        });
    }
    static async handleBookingCompleted(params) {
        const { eventId, payload, } = params;
        const bookingId = this.requireObjectId(payload, "bookingId");
        const userId = this.requireObjectId(payload, "userId");
        const bookingReference = this.requireString(payload, "bookingReference");
        const completedAt = this.optionalDate(payload, "completedAt");
        return NotificationService
            .createFromTemplate({
            recipientId: userId,
            recipientRole: Role.USER,
            templateCode: "BOOKING_COMPLETED",
            variables: {
                bookingReference,
                ...(completedAt
                    ? {
                        completedAt,
                    }
                    : {}),
            },
            referenceId: bookingId,
            dedupeKey: `OUTBOX-${eventId}-USER-${userId}`,
            channels: {
                email: true,
                push: true,
            },
        });
    }
    static getActorLabel(payload) {
        const source = payload.source;
        if (source ===
            "COORDINATOR_BOOKING") {
            return "your coordinator";
        }
        if (source ===
            "ADMIN_MANUAL") {
            return "an administrator";
        }
        return "an authorized user";
    }
    static getBookingContext(payload) {
        const bookingReference = payload.bookingReference;
        if (typeof bookingReference ===
            "string" &&
            bookingReference.trim()) {
            return ` for booking ${bookingReference.trim()}`;
        }
        return "";
    }
    static async handleFamilyTreeMemberAdded(params) {
        const { eventId, payload, } = params;
        const ownerId = this.requireObjectId(payload, "ownerId");
        const familyMemberId = this.requireObjectId(payload, "familyMemberId");
        const fullName = this.requireString(payload, "fullName");
        const actorLabel = this.getActorLabel(payload);
        const bookingContext = this.getBookingContext(payload);
        return NotificationService
            .createFromTemplate({
            recipientId: ownerId,
            recipientRole: Role.USER,
            templateCode: "FAMILY_TREE_MEMBER_ADDED",
            variables: {
                fullName,
                actorLabel,
                bookingContext,
            },
            referenceId: familyMemberId,
            dedupeKey: `OUTBOX-${eventId}-USER-${ownerId}`,
            channels: {
                email: false,
                push: true,
            },
        });
    }
    static async handleFamilyTreeMemberUpdated(params) {
        const { eventId, payload, } = params;
        const ownerId = this.requireObjectId(payload, "ownerId");
        const familyMemberId = this.requireObjectId(payload, "familyMemberId");
        const fullName = this.requireString(payload, "fullName");
        const actorLabel = this.getActorLabel(payload);
        const bookingContext = this.getBookingContext(payload);
        const rawChangedFields = payload.changedFields;
        const changedFields = Array.isArray(rawChangedFields)
            ? rawChangedFields
                .filter((value) => typeof value ===
                "string")
                .join(", ")
            : "";
        return NotificationService
            .createFromTemplate({
            recipientId: ownerId,
            recipientRole: Role.USER,
            templateCode: "FAMILY_TREE_MEMBER_UPDATED",
            variables: {
                fullName,
                actorLabel,
                bookingContext,
                changedFields: changedFields ||
                    "family details",
            },
            referenceId: familyMemberId,
            dedupeKey: `OUTBOX-${eventId}-USER-${ownerId}`,
            channels: {
                email: false,
                push: true,
            },
        });
    }
    static async handleFamilyTreeMemberDeleted(params) {
        const { eventId, payload, } = params;
        const ownerId = this.requireObjectId(payload, "ownerId");
        const familyMemberId = this.requireObjectId(payload, "familyMemberId");
        const fullName = this.requireString(payload, "fullName");
        const reason = this.requireString(payload, "reason");
        const actorLabel = this.getActorLabel(payload);
        const bookingContext = this.getBookingContext(payload);
        return NotificationService
            .createFromTemplate({
            recipientId: ownerId,
            recipientRole: Role.USER,
            templateCode: "FAMILY_TREE_MEMBER_DELETED",
            variables: {
                fullName,
                reason,
                actorLabel,
                bookingContext,
            },
            referenceId: familyMemberId,
            dedupeKey: `OUTBOX-${eventId}-USER-${ownerId}`,
            channels: {
                email: true,
                push: true,
            },
        });
    }
    static async handleFamilyTreeMemberRestored(params) {
        const { eventId, payload, } = params;
        const ownerId = this.requireObjectId(payload, "ownerId");
        const familyMemberId = this.requireObjectId(payload, "familyMemberId");
        const fullName = this.requireString(payload, "fullName");
        const actorLabel = this.getActorLabel(payload);
        const bookingContext = this.getBookingContext(payload);
        return NotificationService
            .createFromTemplate({
            recipientId: ownerId,
            recipientRole: Role.USER,
            templateCode: "FAMILY_TREE_MEMBER_RESTORED",
            variables: {
                fullName,
                actorLabel,
                bookingContext,
            },
            referenceId: familyMemberId,
            dedupeKey: `OUTBOX-${eventId}-USER-${ownerId}`,
            channels: {
                email: false,
                push: true,
            },
        });
    }
    static async handleReviewCreated(params) {
        const { eventId, payload, } = params;
        const reviewId = this.requireObjectId(payload, "reviewId");
        const revieweeId = this.requireObjectId(payload, "revieweeId");
        const bookingReference = this.requireString(payload, "bookingReference");
        const direction = this.requireString(payload, "direction");
        const rating = payload.rating;
        if (typeof rating !==
            "number" ||
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5) {
            throw new Error("Invalid rating in REVIEW.CREATED event");
        }
        const recipientRole = direction ===
            "CUSTOMER_TO_COORDINATOR"
            ? Role.COORDINATOR
            : Role.USER;
        return NotificationService
            .createFromTemplate({
            recipientId: revieweeId,
            recipientRole,
            templateCode: "REVIEW_RECEIVED",
            variables: {
                bookingReference,
                rating,
            },
            referenceId: reviewId,
            dedupeKey: `OUTBOX-${eventId}-${recipientRole}-${revieweeId}`,
            channels: {
                email: false,
                push: true,
            },
        });
    }
    static async handleReviewRemovedByAdmin(params) {
        const { eventId, payload, } = params;
        const reviewId = this.requireObjectId(payload, "reviewId");
        const reviewerId = this.requireObjectId(payload, "reviewerId");
        const bookingReference = this.requireString(payload, "bookingReference");
        const direction = this.requireString(payload, "direction");
        const reason = this.requireString(payload, "reason");
        const recipientRole = direction ===
            "CUSTOMER_TO_COORDINATOR"
            ? Role.USER
            : Role.COORDINATOR;
        return NotificationService
            .createFromTemplate({
            recipientId: reviewerId,
            recipientRole,
            templateCode: "REVIEW_REMOVED_BY_ADMIN",
            variables: {
                bookingReference,
                reason,
            },
            referenceId: reviewId,
            dedupeKey: `OUTBOX-${eventId}-${recipientRole}-${reviewerId}`,
            channels: {
                email: true,
                push: true,
            },
        });
    }
    static getQueryRequesterRole(payload) {
        const requesterType = this.requireString(payload, "requesterType");
        if (requesterType ===
            "USER") {
            return Role.USER;
        }
        if (requesterType ===
            "COORDINATOR") {
            return Role.COORDINATOR;
        }
        throw new Error("Invalid requesterType in query notification event");
    }
    static async handleQueryAdminReplied(params) {
        const { eventId, payload, } = params;
        const queryId = this.requireObjectId(payload, "queryId");
        const requesterId = this.requireObjectId(payload, "requesterId");
        const queryReference = this.requireString(payload, "queryReference");
        const subject = this.requireString(payload, "subject");
        const recipientRole = this.getQueryRequesterRole(payload);
        return NotificationService
            .createFromTemplate({
            recipientId: requesterId,
            recipientRole,
            templateCode: "QUERY_ADMIN_REPLIED",
            variables: {
                queryReference,
                subject,
            },
            referenceId: queryId,
            dedupeKey: `OUTBOX-${eventId}-${recipientRole}-${requesterId}`,
            channels: {
                email: true,
                push: true,
            },
        });
    }
    static async handleQueryRequesterReplied(params) {
        const { eventId, payload, } = params;
        const queryId = this.requireObjectId(payload, "queryId");
        const assignedAdminId = this.requireObjectId(payload, "assignedAdminId");
        const queryReference = this.requireString(payload, "queryReference");
        const subject = this.requireString(payload, "subject");
        return NotificationService
            .createFromTemplate({
            recipientId: assignedAdminId,
            recipientRole: Role.ADMIN,
            templateCode: "QUERY_REQUESTER_REPLIED",
            variables: {
                queryReference,
                subject,
            },
            referenceId: queryId,
            dedupeKey: `OUTBOX-${eventId}-ADMIN-${assignedAdminId}`,
            channels: {
                email: false,
                push: true,
            },
        });
    }
    static async handleQueryAssigned(params) {
        const { eventId, payload, } = params;
        const queryId = this.requireObjectId(payload, "queryId");
        const assignedAdminId = this.requireObjectId(payload, "assignedAdminId");
        const queryReference = this.requireString(payload, "queryReference");
        const subject = this.requireString(payload, "subject");
        return NotificationService
            .createFromTemplate({
            recipientId: assignedAdminId,
            recipientRole: Role.ADMIN,
            templateCode: "QUERY_ASSIGNED",
            variables: {
                queryReference,
                subject,
            },
            referenceId: queryId,
            dedupeKey: `OUTBOX-${eventId}-ADMIN-${assignedAdminId}`,
            channels: {
                email: false,
                push: true,
            },
        });
    }
    static async handleQueryResolved(params) {
        const { eventId, payload, } = params;
        const queryId = this.requireObjectId(payload, "queryId");
        const requesterId = this.requireObjectId(payload, "requesterId");
        const queryReference = this.requireString(payload, "queryReference");
        const subject = this.requireString(payload, "subject");
        const recipientRole = this.getQueryRequesterRole(payload);
        return NotificationService
            .createFromTemplate({
            recipientId: requesterId,
            recipientRole,
            templateCode: "QUERY_RESOLVED",
            variables: {
                queryReference,
                subject,
            },
            referenceId: queryId,
            dedupeKey: `OUTBOX-${eventId}-${recipientRole}-${requesterId}`,
            channels: {
                email: true,
                push: true,
            },
        });
    }
    static async handleQueryRejected(params) {
        const { eventId, payload, } = params;
        const queryId = this.requireObjectId(payload, "queryId");
        const requesterId = this.requireObjectId(payload, "requesterId");
        const queryReference = this.requireString(payload, "queryReference");
        const subject = this.requireString(payload, "subject");
        const reason = this.requireString(payload, "reason");
        const recipientRole = this.getQueryRequesterRole(payload);
        return NotificationService
            .createFromTemplate({
            recipientId: requesterId,
            recipientRole,
            templateCode: "QUERY_REJECTED",
            variables: {
                queryReference,
                subject,
                reason,
            },
            referenceId: queryId,
            dedupeKey: `OUTBOX-${eventId}-${recipientRole}-${requesterId}`,
            channels: {
                email: true,
                push: true,
            },
        });
    }
    static async handleQueryReopened(params) {
        const { eventId, payload, } = params;
        const queryId = this.requireObjectId(payload, "queryId");
        const requesterId = this.requireObjectId(payload, "requesterId");
        const queryReference = this.requireString(payload, "queryReference");
        const subject = this.requireString(payload, "subject");
        const recipientRole = this.getQueryRequesterRole(payload);
        return NotificationService
            .createFromTemplate({
            recipientId: requesterId,
            recipientRole,
            templateCode: "QUERY_REOPENED",
            variables: {
                queryReference,
                subject,
            },
            referenceId: queryId,
            dedupeKey: `OUTBOX-${eventId}-${recipientRole}-${requesterId}`,
            channels: {
                email: true,
                push: true,
            },
        });
    }
    static async handleQueryDeleted(params) {
        const { eventId, payload, } = params;
        const queryId = this.requireObjectId(payload, "queryId");
        const requesterId = this.requireObjectId(payload, "requesterId");
        const queryReference = this.requireString(payload, "queryReference");
        const subject = this.requireString(payload, "subject");
        const reason = this.requireString(payload, "reason");
        const recipientRole = this.getQueryRequesterRole(payload);
        return NotificationService
            .createFromTemplate({
            recipientId: requesterId,
            recipientRole,
            templateCode: "QUERY_DELETED",
            variables: {
                queryReference,
                subject,
                reason,
            },
            referenceId: queryId,
            dedupeKey: `OUTBOX-${eventId}-${recipientRole}-${requesterId}`,
            channels: {
                email: true,
                push: true,
            },
        });
    }
    static async handlePaymentFailed(params) {
        const { eventId, payload, } = params;
        const bookingId = this.requireObjectId(payload, "bookingId");
        const userId = this.requireObjectId(payload, "userId");
        const bookingReference = this.requireString(payload, "bookingReference");
        const reason = this.requireString(payload, "reason");
        return NotificationService
            .createFromTemplate({
            recipientId: userId,
            recipientRole: Role.USER,
            templateCode: "PAYMENT_FAILED",
            variables: {
                bookingReference,
                reason,
            },
            referenceId: bookingId,
            dedupeKey: `OUTBOX-${eventId}-USER-${userId}`,
            channels: {
                email: true,
                push: true,
            },
        });
    }
    static async handlePaymentRefunded(params) {
        const { eventId, payload, } = params;
        const bookingId = this.requireObjectId(payload, "bookingId");
        const userId = this.requireObjectId(payload, "userId");
        const bookingReference = this.requireString(payload, "bookingReference");
        const refundedAmount = payload.refundedAmount;
        if (typeof refundedAmount !==
            "number" ||
            !Number.isFinite(refundedAmount)) {
            throw new Error("Invalid refundedAmount in PAYMENT.REFUNDED event");
        }
        const paymentStatus = this.requireString(payload, "paymentStatus");
        const reason = this.requireString(payload, "reason");
        return NotificationService
            .createFromTemplate({
            recipientId: userId,
            recipientRole: Role.USER,
            templateCode: "PAYMENT_REFUNDED",
            variables: {
                bookingReference,
                refundedAmount,
                paymentStatus,
                reason,
            },
            referenceId: bookingId,
            dedupeKey: `OUTBOX-${eventId}-USER-${userId}`,
            channels: {
                email: true,
                push: true,
            },
        });
    }
}
//# sourceMappingURL=notification-event.handler.js.map