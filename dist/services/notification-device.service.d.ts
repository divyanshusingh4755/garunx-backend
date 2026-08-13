import { Types } from "mongoose";
import { type DevicePlatform } from "../models/notification-device.model.js";
export interface SendPushToUserParams {
    userId: string;
    title: string;
    message: string;
    data?: Record<string, string>;
}
export declare class NotificationDeviceService {
    static registerDevice(params: {
        userId: string;
        token: string;
        platform: DevicePlatform;
        deviceId?: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/notification-device.model.js").INotificationDevice, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification-device.model.js").INotificationDevice & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static deactivateDevice(params: {
        userId: string;
        token: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/notification-device.model.js").INotificationDevice, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification-device.model.js").INotificationDevice & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static sendToUser(params: SendPushToUserParams): Promise<{
        attempted: number;
        successCount: number;
        failureCount: number;
        deactivatedCount: number;
    }>;
}
//# sourceMappingURL=notification-device.service.d.ts.map