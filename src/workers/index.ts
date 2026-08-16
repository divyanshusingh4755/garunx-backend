import "./notification-email.worker.js";
import "./notification-push.worker.js";
import "./notification-chat-push.worker.js"

import {
    startOutboxWorker,
} from "./outbox.worker.js";

startOutboxWorker();

console.log(
    "Background workers started",
);