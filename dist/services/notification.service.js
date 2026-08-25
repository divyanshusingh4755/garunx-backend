import { Types } from "mongoose";
import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import { Role } from "../types/rbac.js";
import { getSocketServer } from "../socket/socket.instance.js";
import { getUserRoom } from "../socket/socket.rooms.js";
import { toNotificationSocketDto } from "../socket/notification.dto.js";
import { mongo } from "mongoose";
import { NotificationTemplateService } from "./notification-template.service.js";
import { EmailService } from "../utils/sendEmail.js";
import { NotificationDeviceService } from "./notification-device.service.js";
import { NotificationPreferenceService } from "./notification-preference.service.js";
import { NotificationQueueService } from "./notification-queue.service.js";
export class NotificationService {
    static isCategoryEnabled(params) {
        const { category, preferences } = params;
        switch (category) {
            case "BOOKING": return preferences.categories.booking;
            case "PAYMENT": return preferences.categories.payment;
            case "QUERY": return preferences.categories.query;
            case "REVIEW": return preferences.categories.review;
            case "PROMOTIONAL": return preferences.categories.promotional;
            case "APP_UPDATE": return preferences.categories.appUpdate;
            case "NEW_FEATURE": return preferences.categories.newFeature;
            case "SYSTEM": return false;
        }
    }
    static async emitUnreadCount(userId) {
        const io = getSocketServer();
        if (!io) {
            return;
        }
        const recipientId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
        const unreadCount = await Notification.countDocuments({ recipientId, isRead: false, isDeleted: false, showInApp: true });
        io.to(getUserRoom(recipientId.toString())).emit("notification:unread-count", { unreadCount });
    }
    static async createNotification(params) {
        const { recipientId, recipientRole, title, message, type, referenceId, dedupeKey, emailRequested = false, pushRequested = false, templateCode, emailSubject, emailBody, pushTitle, pushMessage, showInApp = true } = params;
        if (!Types.ObjectId.isValid(recipientId)) {
            throw new Error("Invalid recipient ID");
        }
        if (referenceId && !Types.ObjectId.isValid(referenceId)) {
            throw new Error("Invalid reference ID");
        }
        let notification;
        try {
            notification = await Notification.create({
                recipientId: new Types.ObjectId(recipientId),
                recipientRole,
                title,
                message,
                type,
                showInApp,
                ...(referenceId && { referenceId: new Types.ObjectId(referenceId) }),
                ...(dedupeKey && { dedupeKey }),
                ...(templateCode && {
                    templateCode: templateCode.trim().toUpperCase(),
                }),
                emailDelivery: {
                    status: emailRequested ? "PENDING" : "NOT_REQUESTED",
                    ...(emailSubject && { subject: emailSubject }),
                    ...(emailBody && { body: emailBody }),
                },
                pushDelivery: {
                    status: pushRequested ? "PENDING" : "NOT_REQUESTED",
                    ...(pushTitle && { title: pushTitle }),
                    ...(pushMessage && { message: pushMessage }),
                },
            });
        }
        catch (error) {
            if (dedupeKey && error instanceof mongo.MongoServerError && error.code === 11000) {
                const existingNotification = await Notification.findOne({ recipientId: new Types.ObjectId(recipientId), dedupeKey });
                if (existingNotification) {
                    return { notification: existingNotification, created: false };
                }
            }
            throw error;
        }
        const io = getSocketServer();
        if (io && notification.showInApp) {
            try {
                io.to(getUserRoom(notification.recipientId.toString())).emit("notification:new", toNotificationSocketDto(notification));
                await this.emitUnreadCount(notification.recipientId);
            }
            catch (error) {
                console.error("Failed to emit realtime notification:", error);
            }
        }
        return { notification, created: true };
    }
    static async getMyNotifications(params) {
        const { userId, page = 1, limit = 20, isRead, type } = params;
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
        const skip = (safePage - 1) * safeLimit;
        const recipientId = new Types.ObjectId(userId);
        const query = { recipientId, isDeleted: false, showInApp: true };
        if (typeof isRead === "boolean") {
            query.isRead = isRead;
        }
        if (type) {
            query.type = type;
        }
        const [notifications, total, unreadCount,] = await Promise.all([
            Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
            Notification.countDocuments(query),
            Notification.countDocuments({ recipientId, isRead: false, isDeleted: false, showInApp: true }),
        ]);
        return {
            notifications,
            pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
            unreadCount,
        };
    }
    static async getUnreadCount(userId) {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }
        const unreadCount = await Notification.countDocuments({ recipientId: new Types.ObjectId(userId), isRead: false, isDeleted: false, showInApp: true });
        return { unreadCount };
    }
    static async markAsRead(params) {
        const { notificationId, userId } = params;
        if (!Types.ObjectId.isValid(notificationId)) {
            throw new Error("Invalid notification ID");
        }
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }
        const notification = await Notification.findOneAndUpdate({ _id: notificationId, recipientId: userId, isDeleted: false, showInApp: true }, { $set: { isRead: true, readAt: new Date() } }, { new: true });
        if (!notification) {
            throw new Error("Notification not found");
        }
        const io = getSocketServer();
        if (io && notification.readAt) {
            io.to(getUserRoom(userId)).emit("notification:read", { notificationId: notification._id.toString(), readAt: notification.readAt.toISOString() });
            await this.emitUnreadCount(notification.recipientId);
        }
        return notification;
    }
    static async markAllAsRead(userId) {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }
        const readAt = new Date();
        const result = await Notification.updateMany({ recipientId: userId, isRead: false, isDeleted: false, showInApp: true }, { $set: { isRead: true, readAt } });
        const io = getSocketServer();
        if (io && result.modifiedCount > 0) {
            io.to(getUserRoom(userId)).emit("notification:read-all", { readAt: readAt.toISOString() });
            await this.emitUnreadCount(userId);
        }
        return { modifiedCount: result.modifiedCount };
    }
    static async deleteNotification(params) {
        const { notificationId, userId } = params;
        if (!Types.ObjectId.isValid(notificationId)) {
            throw new Error("Invalid notification ID");
        }
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }
        const notification = await Notification.findOneAndUpdate({ _id: notificationId, recipientId: userId, isDeleted: false, showInApp: true }, { $set: { isDeleted: true } }, { new: true });
        if (!notification) {
            throw new Error("Notification not found");
        }
        const io = getSocketServer();
        if (io) {
            io.to(getUserRoom(userId)).emit("notification:deleted", { notificationId: notification._id.toString() });
            await this.emitUnreadCount(notification.recipientId);
        }
        return { message: "Notification deleted successfully" };
    }
    static async sendAdminNotification(params) {
        const { title, message, type, audience, referenceId } = params;
        if (referenceId && !Types.ObjectId.isValid(referenceId)) {
            throw new Error("Invalid reference ID");
        }
        const userQuery = { isActive: true };
        if (audience !== "ALL") {
            userQuery.role = audience;
        }
        const users = await User.find(userQuery).select("_id role");
        if (!users.length) {
            throw new Error("No users found for selected audience");
        }
        const notifications = users.map((user) => ({
            recipientId: user._id,
            recipientRole: user.role,
            title,
            message,
            type,
            ...(referenceId && { referenceId: new Types.ObjectId(referenceId) }),
        }));
        const result = await Notification.insertMany(notifications);
        const io = getSocketServer();
        if (io) {
            for (const notification of result) {
                io.to(getUserRoom(notification.recipientId.toString())).emit("notification:new", toNotificationSocketDto(notification));
            }
        }
        return { totalRecipients: result.length };
    }
    static async createFromTemplate(params) {
        const { recipientId, recipientRole, templateCode, variables = {}, referenceId, dedupeKey, channels = {} } = params;
        // 1. Render notification template
        const rendered = await NotificationTemplateService.renderTemplate({ templateCode, variables, includeEmail: channels.email === true, includePush: channels.push === true });
        let showInApp = true;
        let effectiveEmail = channels.email === true;
        let effectivePush = channels.push === true;
        if (rendered.preferenceMode === "OPTIONAL") {
            const preferences = await NotificationPreferenceService.getOrCreatePreferences(recipientId.toString());
            const categoryEnabled = this.isCategoryEnabled({ category: rendered.category, preferences });
            if (!categoryEnabled) {
                return {
                    notification: null, created: false, skipped: true, skipReason: "CATEGORY_DISABLED",
                    delivery: { inApp: false, email: false, push: false },
                };
            }
            showInApp = preferences.channels.inApp;
            effectiveEmail = effectiveEmail && preferences.channels.email;
            effectivePush = effectivePush && preferences.channels.push;
        }
        if (!showInApp && !effectiveEmail && !effectivePush) {
            return {
                notification: null,
                created: false,
                skipped: true,
                skipReason: "ALL_CHANNELS_DISABLED",
                delivery: { inApp: false, email: false, push: false },
            };
        }
        // 2. Determine requested delivery channels In-app notification is always created.
        if (effectiveEmail && (!rendered.emailSubject || !rendered.emailBody)) {
            throw new Error(`Email content is not configured for notification template ${rendered.code}`);
        }
        if (effectivePush && (!rendered.pushTitle || !rendered.pushMessage)) {
            throw new Error(`Push content is not configured for notification template ${rendered.code}`);
        }
        const emailRequested = effectiveEmail;
        const pushRequested = effectivePush;
        // 3. Create in-app notification
        const { notification, created } = await this.createNotification({
            recipientId,
            recipientRole,
            title: rendered.title,
            message: rendered.message,
            type: rendered.type,
            templateCode: rendered.code,
            ...(referenceId && { referenceId }),
            ...(dedupeKey && { dedupeKey }),
            emailRequested,
            showInApp,
            pushRequested,
            ...(emailRequested && { emailSubject: rendered.emailSubject, emailBody: rendered.emailBody }),
            ...(pushRequested && { pushTitle: rendered.pushTitle, pushMessage: rendered.pushMessage }),
        });
        // 4. Duplicate notification createNotification() returns created:false when the dedupeKey already exists. Do NOT send email/push again.
        if (!created) {
            // Notification already exists. Normally we don't want duplicate deliveries. But if delivery is still PENDING, the previous attempt may have failed before the BullMQ job was created. Deterministic BullMQ job IDs make re-enqueueing safe while the original job still exists.
            if (notification.emailDelivery.status === "PENDING") {
                await NotificationQueueService.enqueueEmail(notification._id.toString());
            }
            if (notification.pushDelivery.status === "PENDING") {
                await NotificationQueueService.enqueuePush(notification._id.toString());
            }
            return {
                notification,
                created: false,
                skipped: false,
                delivery: {
                    inApp: notification.showInApp,
                    email: notification.emailDelivery.status === "PENDING" ? "QUEUED" : false,
                    push: notification.pushDelivery.status === "PENDING" ? "QUEUED" : false,
                },
            };
        }
        // QUEUE DELIVERY Notification is already persisted. Email and push are now processed asynchronously by BullMQ workers.
        if (emailRequested) {
            await NotificationQueueService.enqueueEmail(notification._id.toString());
        }
        if (pushRequested) {
            await NotificationQueueService.enqueuePush(notification._id.toString());
        }
        return {
            notification,
            created: true,
            delivery: {
                inApp: showInApp,
                email: emailRequested ? "QUEUED" : false,
                push: pushRequested ? "QUEUED" : false,
            },
        };
    }
    static async deliverEmail(notificationId) {
        if (!Types.ObjectId.isValid(notificationId)) {
            throw new Error("Invalid notification ID");
        }
        const notification = await Notification.findById(notificationId);
        if (!notification) {
            throw new Error("Notification not found");
        }
        // Don't accidentally send an email that was never requested.
        if (notification.emailDelivery.status === "NOT_REQUESTED") {
            return { skipped: true, reason: "EMAIL_NOT_REQUESTED" };
        }
        // Important for idempotency. If BullMQ somehow processes this job again after successful delivery, don't send the email again.
        if (notification.emailDelivery.status === "SENT") {
            return { skipped: true, reason: "EMAIL_ALREADY_SENT" };
        }
        const { subject, body } = notification.emailDelivery;
        if (!subject || !body) {
            await Notification.updateOne({ _id: notification._id }, {
                $set: {
                    "emailDelivery.status": "FAILED",
                    "emailDelivery.failedAt": new Date(),
                    "emailDelivery.error": "Email content not found",
                },
            });
            // Configuration/data problem. Retrying will not fix it.
            return { skipped: true, reason: "EMAIL_CONTENT_MISSING" };
        }
        const user = await User.findById(notification.recipientId).select("email");
        if (!user?.email) {
            await Notification.updateOne({ _id: notification._id }, {
                $set: {
                    "emailDelivery.status": "FAILED",
                    "emailDelivery.failedAt": new Date(),
                    "emailDelivery.error": "Recipient email not found",
                },
            });
            // Permanent failure. Retrying cannot create an email address for the user.
            return { skipped: true, reason: "RECIPIENT_EMAIL_NOT_FOUND" };
        }
        // Keep status PENDING while BullMQ is attempting/retrying the job.
        await Notification.updateOne({ _id: notification._id }, {
            $set: { "emailDelivery.status": "PENDING" },
            $unset: {
                "emailDelivery.failedAt": "",
                "emailDelivery.error": "",
            },
        });
        // IMPORTANT: Do NOT swallow provider errors here. If sendEmail throws, let it reach the BullMQ worker so BullMQ can retry.
        const result = await EmailService.sendEmail({ to: user.email, subject, html: body });
        await Notification.updateOne({ _id: notification._id }, {
            $set: {
                "emailDelivery.status": "SENT",
                "emailDelivery.sentAt": new Date(),
                "emailDelivery.messageId": result.messageId,
            },
            $unset: {
                "emailDelivery.failedAt": "",
                "emailDelivery.error": "",
            },
        });
        return { skipped: false, emailSent: true, messageId: result.messageId };
    }
    static async deliverPush(notificationId) {
        if (!Types.ObjectId.isValid(notificationId)) {
            throw new Error("Invalid notification ID");
        }
        const notification = await Notification.findById(notificationId);
        if (!notification) {
            throw new Error("Notification not found");
        }
        if (notification.pushDelivery.status === "NOT_REQUESTED") {
            return { skipped: true, reason: "PUSH_NOT_REQUESTED" };
        }
        // Prevent resending an already successful push notification.
        if (notification.pushDelivery.status === "SENT") {
            return { skipped: true, reason: "PUSH_ALREADY_SENT" };
        }
        const { title, message } = notification.pushDelivery;
        if (!title || !message) {
            await Notification.updateOne({ _id: notification._id }, {
                $set: {
                    "pushDelivery.status": "FAILED",
                    "pushDelivery.failedAt": new Date(),
                    "pushDelivery.error": "Push notification content not found",
                },
            });
            return { skipped: true, reason: "PUSH_CONTENT_MISSING" };
        }
        await Notification.updateOne({ _id: notification._id }, {
            $set: { "pushDelivery.status": "PENDING" },
            $unset: {
                "pushDelivery.failedAt": "",
                "pushDelivery.error": "",
            },
        });
        const result = await NotificationDeviceService.sendToUser({
            userId: notification.recipientId.toString(),
            title,
            message,
            data: {
                notificationId: notification._id.toString(),
                type: notification.type,
                ...(notification.referenceId && { referenceId: notification.referenceId.toString() }),
            },
        });
        // No devices means retrying won't help.
        if (result.attempted === 0) {
            await Notification.updateOne({ _id: notification._id }, {
                $set: {
                    "pushDelivery.status": "FAILED",
                    "pushDelivery.attemptedCount": 0,
                    "pushDelivery.successCount": 0,
                    "pushDelivery.failureCount": 0,
                    "pushDelivery.failedAt": new Date(),
                    "pushDelivery.error": "No active notification devices found",
                },
                $unset: { "pushDelivery.sentAt": "" },
            });
            return { skipped: true, reason: "NO_ACTIVE_DEVICES" };
        }
        // All devices succeeded.
        if (result.successCount > 0 && result.failureCount === 0) {
            await Notification.updateOne({ _id: notification._id }, {
                $set: {
                    "pushDelivery.status": "SENT",
                    "pushDelivery.attemptedCount": result.attempted,
                    "pushDelivery.successCount": result.successCount,
                    "pushDelivery.failureCount": result.failureCount,
                    "pushDelivery.sentAt": new Date(),
                },
                $unset: {
                    "pushDelivery.failedAt": "",
                    "pushDelivery.error": "",
                },
            });
            return {
                status: "SENT",
                attempted: result.attempted,
                successCount: result.successCount,
                failureCount: result.failureCount,
                deactivatedCount: result.deactivatedCount,
            };
        }
        // Some devices succeeded. IMPORTANT: We do NOT automatically retry PARTIAL delivery because successful devices could receive the same push twice.
        if (result.successCount > 0) {
            await Notification.updateOne({ _id: notification._id }, {
                $set: {
                    "pushDelivery.status": "PARTIAL",
                    "pushDelivery.attemptedCount": result.attempted,
                    "pushDelivery.successCount": result.successCount,
                    "pushDelivery.failureCount": result.failureCount,
                    "pushDelivery.sentAt": new Date(),
                },
                $unset: {
                    "pushDelivery.failedAt": "",
                    "pushDelivery.error": "",
                },
            });
            return {
                status: "PARTIAL",
                attempted: result.attempted,
                successCount: result.successCount,
                failureCount: result.failureCount,
                deactivatedCount: result.deactivatedCount,
            };
        }
        // We attempted delivery but EVERY device failed. Save the counts but keep PENDING. Then throw so BullMQ retries.
        await Notification.updateOne({ _id: notification._id }, {
            $set: {
                "pushDelivery.status": "PENDING",
                "pushDelivery.attemptedCount": result.attempted,
                "pushDelivery.successCount": 0,
                "pushDelivery.failureCount": result.failureCount,
                "pushDelivery.error": "Push delivery failed for all active devices",
            },
        });
        throw new Error("Push delivery failed for all active devices");
    }
    static async markEmailDeliveryFailed(notificationId, error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to send email";
        await Notification.updateOne({ _id: notificationId }, {
            $set: {
                "emailDelivery.status": "FAILED",
                "emailDelivery.failedAt": new Date(),
                "emailDelivery.error": errorMessage,
            },
        });
    }
    static async markPushDeliveryFailed(notificationId, error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to send push notification";
        await Notification.updateOne({ _id: notificationId }, {
            $set: {
                "pushDelivery.status": "FAILED",
                "pushDelivery.failedAt": new Date(),
                "pushDelivery.error": errorMessage,
            },
        });
    }
    static async retryEmail(notificationId) {
        if (!Types.ObjectId.isValid(notificationId)) {
            throw new Error("Invalid notification ID");
        }
        // Atomic claim. Only ONE retry request can change FAILED -> RETRYING.
        const notification = await Notification.findOneAndUpdate({ _id: notificationId, isDeleted: false, "emailDelivery.status": "FAILED" }, {
            $set: { "emailDelivery.status": "RETRYING" },
            $unset: {
                "emailDelivery.failedAt": "",
                "emailDelivery.error": "",
            },
        }, { new: true });
        if (!notification) {
            throw new Error("Notification email is not available for retry");
        }
        if (!notification.emailDelivery.subject || !notification.emailDelivery.body) {
            await Notification.updateOne({ _id: notification._id }, {
                $set: {
                    "emailDelivery.status": "FAILED",
                    "emailDelivery.error": "Email content not found",
                },
            });
            throw new Error("Email content not found for this notification");
        }
        try {
            await NotificationQueueService.enqueueEmailRetry(notification._id.toString());
            return { queued: true, notificationId: notification._id };
        }
        catch (error) {
            // Redis failed. Restore the retryable state.
            await Notification.updateOne({ _id: notification._id, "emailDelivery.status": "RETRYING" }, {
                $set: {
                    "emailDelivery.status": "FAILED",
                    "emailDelivery.failedAt": new Date(),
                    "emailDelivery.error": error instanceof Error ? error.message : "Failed to queue email retry",
                },
            });
            throw error;
        }
    }
    static async retryPush(notificationId) {
        if (!Types.ObjectId.isValid(notificationId)) {
            throw new Error("Invalid notification ID");
        }
        const notification = await Notification.findOne({ _id: notificationId, isDeleted: false });
        if (!notification) {
            throw new Error("Notification not found");
        }
        if (!["FAILED", "PARTIAL",].includes(notification.pushDelivery.status)) {
            throw new Error("Only failed or partially delivered push notifications can be retried");
        }
        if (!notification.pushDelivery.title || !notification.pushDelivery.message) {
            throw new Error("Push notification content not found");
        }
        await Notification.updateOne({ _id: notification._id }, {
            $set: { "pushDelivery.status": "PENDING" },
            $unset: {
                "pushDelivery.failedAt": "",
                "pushDelivery.error": "",
            },
        });
        await NotificationQueueService.enqueuePushRetry(notification._id.toString());
        return { queued: true, notificationId: notification._id };
    }
}
//# sourceMappingURL=notification.service.js.map