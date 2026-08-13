import { Types, type Document, type Model } from "mongoose";
export declare const DEVICE_PLATFORMS: readonly ["WEB", "ANDROID", "IOS"];
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];
export interface INotificationDevice extends Document {
    userId: Types.ObjectId;
    token: string;
    platform: DevicePlatform;
    deviceId?: string;
    isActive: boolean;
    lastUsedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const NotificationDevice: Model<INotificationDevice>;
//# sourceMappingURL=notification-device.model.d.ts.map