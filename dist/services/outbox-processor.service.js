import { hostname } from "node:os";
import { OutboxEvent } from "../models/outbox-event.model.js";
import { NotificationEventHandler } from "../events/notification-event.handler.js";
const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_OUTBOX_ATTEMPTS = 10;
export class OutboxProcessorService {
    static workerId = `${hostname()}-${process.pid}`;
    static getRetryDelay(attempts) {
        // 10 sec 20 sec 40 sec 80 sec... Maximum 15 minutes.
        return Math.min(10_000 * Math.pow(2, Math.max(attempts - 1, 0)), 15 * 60 * 1000);
    }
    static async claimNextEvent() {
        const now = new Date();
        const staleBefore = new Date(now.getTime() - PROCESSING_TIMEOUT_MS);
        return OutboxEvent.findOneAndUpdate({
            $or: [
                // New events.
                { status: "PENDING" },
                // Failed event whose retry time has arrived.
                {
                    status: "FAILED",
                    attempts: { $lt: MAX_OUTBOX_ATTEMPTS },
                    $or: [{ nextRetryAt: { $lte: now } }, { nextRetryAt: { $exists: false } }],
                },
                // PROCESSING event whose worker probably died.
                {
                    status: "PROCESSING",
                    attempts: { $lt: MAX_OUTBOX_ATTEMPTS },
                    $or: [{ lockedAt: { $lte: staleBefore } }, { lockedAt: { $exists: false } }],
                },
            ],
        }, {
            $set: { status: "PROCESSING", lockedAt: now, lockedBy: this.workerId, lastAttemptAt: now },
            $inc: { attempts: 1 },
            $unset: { nextRetryAt: "", error: "" },
        }, { new: true, sort: { createdAt: 1 } });
    }
    static async processOne() {
        const event = await this.claimNextEvent();
        if (!event) {
            return { processed: false };
        }
        try {
            await NotificationEventHandler.handle({ eventId: event.eventId, eventType: event.eventType, aggregateId: event.aggregateId, payload: event.payload });
            await OutboxEvent.updateOne({ _id: event._id, status: "PROCESSING", lockedBy: this.workerId }, {
                $set: { status: "PROCESSED", processedAt: new Date() },
                $unset: { lockedAt: "", lockedBy: "", nextRetryAt: "", error: "" },
            });
            return { processed: true, success: true, eventId: event.eventId };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown outbox processing error";
            const attempts = event.attempts;
            const retryDelay = this.getRetryDelay(attempts);
            await OutboxEvent.updateOne({ _id: event._id, lockedBy: this.workerId }, {
                $set: {
                    status: "FAILED",
                    error: errorMessage,
                    nextRetryAt: new Date(Date.now() + retryDelay),
                },
                $unset: { lockedAt: "", lockedBy: "" },
            });
            console.error(`[OUTBOX] Event failed ${event.eventId}:`, error);
            return { processed: true, success: false, eventId: event.eventId, error: errorMessage };
        }
    }
}
//# sourceMappingURL=outbox-processor.service.js.map