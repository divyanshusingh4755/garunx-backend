import type { ClientSession } from "mongoose";
import type { DomainEventType } from "../events/domain-events.js";
export declare class OutboxService {
    static createEvent(params: {
        eventType: DomainEventType;
        aggregateType: string;
        aggregateId: string;
        payload: Record<string, unknown>;
        session: ClientSession;
        eventId?: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/outbox-event.model.js").IOutboxEvent, {}, import("mongoose").DefaultSchemaOptions> & import("../models/outbox-event.model.js").IOutboxEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
}
//# sourceMappingURL=outbox.service.d.ts.map