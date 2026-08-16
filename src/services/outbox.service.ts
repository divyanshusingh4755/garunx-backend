import {
    randomUUID,
} from "node:crypto";

import type {
    ClientSession,
} from "mongoose";

import {
    OutboxEvent,
} from "../models/outbox-event.model.js";

import type {
    DomainEventType,
} from "../events/domain-events.js";

export class OutboxService {
    static async createEvent(params: {
        eventType: DomainEventType;

        aggregateType: string;

        aggregateId: string;

        payload: Record<
            string,
            unknown
        >;

        session: ClientSession;

        eventId?: string;
    }) {
        const {
            eventType,
            aggregateType,
            aggregateId,
            payload,
            session,
            eventId =
            randomUUID(),
        } = params;

        const [event] =
            await OutboxEvent.create(
                [
                    {
                        eventId,

                        eventType,

                        aggregateType,

                        aggregateId,

                        payload,

                        status:
                            "PENDING",

                        attempts:
                            0,
                    },
                ],
                {
                    session,
                },
            );

        if (!event) {
            throw new Error(
                "Failed to create outbox event",
            );
        }

        return event;
    }
}