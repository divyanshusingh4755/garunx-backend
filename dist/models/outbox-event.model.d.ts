import { type Document, type Model } from "mongoose";
import { type DomainEventType } from "../events/domain-events.js";
export declare const OUTBOX_EVENT_STATUSES: readonly ["PENDING", "PROCESSING", "PROCESSED", "FAILED"];
export type OutboxEventStatus = (typeof OUTBOX_EVENT_STATUSES)[number];
export interface IOutboxEvent extends Document {
    eventId: string;
    eventType: DomainEventType;
    aggregateType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
    status: OutboxEventStatus;
    attempts: number;
    lastAttemptAt?: Date;
    nextRetryAt?: Date;
    processedAt?: Date;
    lockedAt?: Date;
    lockedBy?: string;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const OutboxEvent: Model<IOutboxEvent>;
//# sourceMappingURL=outbox-event.model.d.ts.map