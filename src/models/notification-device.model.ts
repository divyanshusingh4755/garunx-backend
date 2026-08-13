import {
    model,
    Schema,
    Types,
    type Document,
    type Model,
} from "mongoose";

export const DEVICE_PLATFORMS = [
    "WEB",
    "ANDROID",
    "IOS",
] as const;

export type DevicePlatform =
    (typeof DEVICE_PLATFORMS)[number];

export interface INotificationDevice
    extends Document {
    userId: Types.ObjectId;

    token: string;

    platform: DevicePlatform;

    deviceId?: string;

    isActive: boolean;

    lastUsedAt: Date;

    createdAt: Date;

    updatedAt: Date;
}

const notificationDeviceSchema =
    new Schema<INotificationDevice>(
        {
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
        },
        {
            timestamps: true,
        },
    );

notificationDeviceSchema.index(
    {
        token: 1,
    },
    {
        unique: true,
    },
);

notificationDeviceSchema.index({
    userId: 1,
    isActive: 1,
});

export const NotificationDevice:
    Model<INotificationDevice> =
    model<INotificationDevice>(
        "NotificationDevice",
        notificationDeviceSchema,
    );