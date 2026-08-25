import { OutboxProcessorService } from "../services/outbox-processor.service.js";

const OUTBOX_POLL_INTERVAL_MS = 3000;
const OUTBOX_BATCH_SIZE = 20;
let isProcessing = false;

const processOutbox = async () => {
    if (isProcessing) { return; }
    isProcessing = true;

    try {
        for (let index = 0; index < OUTBOX_BATCH_SIZE; index++) {
            const result = await OutboxProcessorService.processOne();

            // Queue is currently empty.
            if (!result.processed) { break; }
        }
    } catch (error) {
        console.error("[OUTBOX] Processing cycle failed:", error);
    } finally { isProcessing = false; }
};

export const startOutboxWorker = () => {
    setInterval(() => { void processOutbox(); }, OUTBOX_POLL_INTERVAL_MS);

    // Don't wait 3 seconds after application startup.
    void processOutbox();

    console.log("Outbox worker started");
};