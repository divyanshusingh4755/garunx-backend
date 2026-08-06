import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDB } from "./config/db.js";
const rawPort = process.env.PORT?.trim() ?? "3000";
const port = Number(rawPort);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
}
let server;
let isShuttingDown = false;
const shutdown = async (reason, exitCode) => {
    if (isShuttingDown) {
        return;
    }
    isShuttingDown = true;
    console.error(`Shutting down: ${reason}`);
    const closeDatabase = async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    };
    if (!server) {
        try {
            await closeDatabase();
        }
        finally {
            process.exit(exitCode);
        }
    }
    server.close(async (error) => {
        try {
            await closeDatabase();
        }
        catch (disconnectError) {
            console.error("MongoDB disconnect failed:", disconnectError);
            process.exit(1);
        }
        if (error) {
            console.error("HTTP server shutdown failed:", error);
            process.exit(1);
        }
        process.exit(exitCode);
    });
};
const startServer = async () => {
    await connectDB();
    server = app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
    server.on("error", (error) => {
        void shutdown(error.message, 1);
    });
};
process.on("unhandledRejection", (reason) => {
    const message = reason instanceof Error
        ? reason.message
        : String(reason);
    void shutdown(`Unhandled rejection: ${message}`, 1);
});
process.on("uncaughtException", (error) => {
    void shutdown(`Uncaught exception: ${error.message}`, 1);
});
process.on("SIGTERM", () => {
    void shutdown("SIGTERM received", 0);
});
process.on("SIGINT", () => {
    void shutdown("SIGINT received", 0);
});
startServer().catch((error) => {
    const message = error instanceof Error
        ? error.message
        : String(error);
    void shutdown(`Startup failed: ${message}`, 1);
});
//# sourceMappingURL=server.js.map