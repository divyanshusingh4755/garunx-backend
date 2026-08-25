import { model, Schema, Types } from "mongoose";
export const DEVICE_PLATFORMS = ["WEB", "ANDROID", "IOS"];
const notificationDeviceSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    token: {
        type: String,
        required: true,
        trim: true,
    },
    platform: {
        type: String,
        enum: DEVICE_PLATFORMS,
        required: true,
    },
    deviceId: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    lastUsedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});
notificationDeviceSchema.index({ token: 1 }, { unique: true });
notificationDeviceSchema.index({ userId: 1, isActive: 1 });
export const NotificationDevice = model("NotificationDevice", notificationDeviceSchema);
//# sourceMappingURL=notification-device.model.js.map