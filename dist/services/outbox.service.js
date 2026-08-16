import { randomUUID, } from "node:crypto";
import { OutboxEvent, } from "../models/outbox-event.model.js";
export class OutboxService {
    static async createEvent(params) {
        const { eventType, aggregateType, aggregateId, payload, session, eventId = randomUUID(), } = params;
        const [event] = await OutboxEvent.create([
            {
                eventId,
                eventType,
                aggregateType,
                aggregateId,
                payload,
                status: "PENDING",
                attempts: 0,
            },
        ], {
            session,
        });
        if (!event) {
            throw new Error("Failed to create outbox event");
        }
        return event;
    }
}
//# sourceMappingURL=outbox.service.js.map