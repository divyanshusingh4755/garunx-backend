import { Types } from "mongoose";
import { type DomainEventType } from "./domain-events.js";
export interface ProcessDomainEventParams {
    eventId: string;
    eventType: DomainEventType;
    aggregateId: string;
    payload: Record<string, unknown>;
}
export declare class NotificationEventHandler {
    private static requireDate;
    static handle(params: ProcessDomainEventParams): Promise<{
        notification: null;
        created: boolean;
        skipped: boolean;
        skipReason: string;
        delivery: {
            inApp: boolean;
            email: boolean;
            push: boolean;
        };
    } | {
        notification: import("mongoose").Document<unknown, {}, import("../models/notification.model.js").INotification, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification.model.js").INotification & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        created: boolean;
        skipped: boolean;
        delivery: {
            inApp: boolean;
            email: string | boolean;
            push: string | boolean;
        };
        skipReason?: never;
    } | {
        notification: import("mongoose").Document<unknown, {}, import("../models/notification.model.js").INotification, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification.model.js").INotification & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        created: boolean;
        delivery: {
            inApp: boolean;
            email: string | boolean;
            push: string | boolean;
        };
        skipped?: never;
        skipReason?: never;
    } | ({
        notification: null;
        created: boolean;
        skipped: boolean;
        skipReason: string;
        delivery: {
            inApp: boolean;
            email: boolean;
            push: boolean;
        };
    } | {
        notification: import("mongoose").Document<unknown, {}, import("../models/notification.model.js").INotification, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification.model.js").INotification & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        created: boolean;
        skipped: boolean;
        delivery: {
            inApp: boolean;
            email: string | boolean;
            push: string | boolean;
        };
        skipReason?: never;
    } | {
        notification: import("mongoose").Document<unknown, {}, import("../models/notification.model.js").INotification, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification.model.js").INotification & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        created: boolean;
        delivery: {
            inApp: boolean;
            email: string | boolean;
            push: string | boolean;
        };
        skipped?: never;
        skipReason?: never;
    })[] | {
        handled: boolean;
        notificationCreated: boolean;
    }>;
    private static requireObjectId;
    private static optionalObjectId;
    private static requireString;
    private static optionalDate;
    private static handleBookingConfirmed;
    private static handleBookingAssignmentRequested;
    private static handleBookingAssigned;
    private static handleBookingRescheduled;
    private static handleBookingCancelled;
    private static handleBookingStarted;
    private static handleBookingCompleted;
    private static getActorLabel;
    private static getBookingContext;
    private static handleFamilyTreeMemberAdded;
    private static handleFamilyTreeMemberUpdated;
    private static handleFamilyTreeMemberDeleted;
    private static handleFamilyTreeMemberRestored;
    private static handleReviewCreated;
    private static handleReviewRemovedByAdmin;
    private static getQueryRequesterRole;
    private static handleQueryAdminReplied;
    private static handleQueryRequesterReplied;
    private static handleQueryAssigned;
    private static handleQueryResolved;
    private static handleQueryRejected;
    private static handleQueryReopened;
    private static handleQueryDeleted;
    private static handlePaymentFailed;
    private static handlePaymentRefunded;
}
//# sourceMappingURL=notification-event.handler.d.ts.map