import "dotenv/config";
import { createServer, type Server } from "node:http";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initializeSocket, type ChatSocketServer } from "./socket/index.js";
import { startBookingCronJobs } from "./cron/booking.cron.js";
import { startCartCronJobs } from "./cron/cart.cron.js";
import { startNotificationReminderJob } from "./cron/notification-reminder.cron.js";

const rawPort = process.env.PORT?.trim() ?? "3000";

const port = Number(rawPort);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

let server: Server | undefined;
let io: ChatSocketServer | undefined;
let isShuttingDown = false;

const shutdown = async (reason: string, exitCode: number): Promise<void> => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.error(`Shutting down: ${reason}`);

  const closeDatabase = async (): Promise<void> => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  };

  if (!server) {
    try {
      await closeDatabase();
    } finally {
      process.exit(exitCode);
    }
  }

  if (io) {
    io.close();
  }

  server.close(async (error?: Error) => {
    try {
      await closeDatabase();
    } catch (disconnectError: unknown) {
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

const startServer = async (): Promise<void> => {
  await connectDB();
  server = createServer(app);
  io = initializeSocket(server);

  /*
   * Workers may depend on MongoDB and Socket.IO.
   * Start them only after both are initialized.
   */
  await import("./workers/index.js");

  startCartCronJobs();
  startBookingCronJobs();
  startNotificationReminderJob();

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log("Socket.IO server initialized")
  });

  server.on("error", (error: Error) => {
    void shutdown(error.message, 1);
  });
};

process.on("unhandledRejection", (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);

  void shutdown(`Unhandled rejection: ${message}`, 1);
});

process.on("uncaughtException", (error: Error) => {
  void shutdown(`Uncaught exception: ${error.message}`, 1);
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM received", 0);
});

process.on("SIGINT", () => {
  void shutdown("SIGINT received", 0);
});

startServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  void shutdown(`Startup failed: ${message}`, 1);
});
