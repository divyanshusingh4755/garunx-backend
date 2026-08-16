export declare class OutboxProcessorService {
    private static readonly workerId;
    private static getRetryDelay;
    static claimNextEvent(): Promise<(import("mongoose").Document<unknown, {}, import("../models/outbox-event.model.js").IOutboxEvent, {}, import("mongoose").DefaultSchemaOptions> & import("../models/outbox-event.model.js").IOutboxEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    static processOne(): Promise<{
        processed: boolean;
        success?: never;
        eventId?: never;
        error?: never;
    } | {
        processed: boolean;
        success: boolean;
        eventId: string;
        error?: never;
    } | {
        processed: boolean;
        success: boolean;
        eventId: string;
        error: string;
    }>;
}
//# sourceMappingURL=outbox-processor.service.d.ts.map