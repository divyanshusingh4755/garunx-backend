import { Types } from "mongoose";
import { firebaseMessaging } from "../config/firebase.js";
import { NotificationDevice } from "../models/notification-device.model.js";
export class NotificationDeviceService {
    static async registerDevice(params) {
        const { userId, token, platform, deviceId } = params;
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }
        // Token is globally unique. If this token already belongs to another user, reassign it to the currently authenticated user. This can happen when: User A logs out from a device User B logs in on the same device.
        const device = await NotificationDevice.findOneAndUpdate({ token }, {
            $set: {
                userId, platform, isActive: true, lastUsedAt: new Date(), ...(deviceId !== undefined && { deviceId }),
            }, ...(deviceId === undefined ? { $unset: { deviceId: "" } } : {}),
        }, { new: true, upsert: true, runValidators: true });
        return device;
    }
    static async deactivateDevice(params) {
        const { userId, token } = params;
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }
        const device = await NotificationDevice.findOneAndUpdate({ userId, token }, { $set: { isActive: false, lastUsedAt: new Date() } }, { new: true });
        if (!device) {
            throw new Error("Notification device not found");
        }
        return device;
    }
    static async sendToUser(params) {
        const { userId, title, message, data } = params;
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }
        const devices = await NotificationDevice.find({ userId, isActive: true }).select("_id token");
        if (!devices.length) {
            return { attempted: 0, successCount: 0, failureCount: 0, deactivatedCount: 0 };
        }
        const tokens = devices.map((device) => device.token);
        const response = await firebaseMessaging.sendEachForMulticast({
            tokens,
            notification: { title, body: message },
            ...(data && { data }),
        });
        const invalidDeviceIds = [];
        response.responses.forEach((item, index) => {
            if (item.success) {
                return;
            }
            const code = item.error?.code;
            if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
                const device = devices[index];
                if (device) {
                    invalidDeviceIds.push(device._id);
                }
            }
        });
        let deactivatedCount = 0;
        if (invalidDeviceIds.length > 0) {
            const result = await NotificationDevice.updateMany({ _id: { $in: invalidDeviceIds } }, { $set: { isActive: false, lastUsedAt: new Date() } });
            deactivatedCount = result.modifiedCount;
        }
        return {
            attempted: tokens.length,
            successCount: response.successCount,
            failureCount: response.failureCount,
            deactivatedCount,
        };
    }
}
//# sourceMappingURL=notification-device.service.js.map