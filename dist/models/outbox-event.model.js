import { model, Schema, } from "mongoose";
import { DOMAIN_EVENTS, } from "../events/domain-events.js";
export const OUTBOX_EVENT_STATUSES = [
    "PENDING",
    "PROCESSING",
    "PROCESSED",
    "FAILED",
];
const outboxEventSchema = new Schema({
    eventId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
    },
    eventType: {
        type: String,
        enum: Object.values(DOMAIN_EVENTS),
        required: true,
        index: true,
    },
    aggregateType: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    aggregateId: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    payload: {
        type: Schema.Types.Mixed,
        required: true,
    },
    status: {
        type: String,
        enum: OUTBOX_EVENT_STATUSES,
        default: "PENDING",
        required: true,
        index: true,
    },
    attempts: {
        type: Number,
        default: 0,
        min: 0,
    },
    lastAttemptAt: Date,
    nextRetryAt: {
        type: Date,
        index: true,
    },
    processedAt: Date,
    lockedAt: {
        type: Date,
        index: true,
    },
    lockedBy: String,
    error: {
        type: String,
        maxlength: 2000,
    },
}, {
    timestamps: true,
});
outboxEventSchema.index({
    status: 1,
    nextRetryAt: 1,
    createdAt: 1,
});
outboxEventSchema.index({
    status: 1,
    lockedAt: 1,
});
outboxEventSchema.index({
    aggregateType: 1,
    aggregateId: 1,
    createdAt: -1,
});
export const OutboxEvent = model("OutboxEvent", outboxEventSchema);
//# sourceMappingURL=outbox-event.model.js.map