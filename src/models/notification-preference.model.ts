import { model, Schema, Types, type Document, type Model } from "mongoose";

export const NOTIFICATION_PREFERENCE_CATEGORIES = ["BOOKING", "PAYMENT", "QUERY", "REVIEW", "PROMOTIONAL", "APP_UPDATE", "NEW_FEATURE"] as const;
export type NotificationPreferenceCategory = (typeof NOTIFICATION_PREFERENCE_CATEGORIES)[number];

export interface INotificationPreference
    extends Document {
    userId: Types.ObjectId;
    categories: {
        booking: boolean;
        payment: boolean;
        query: boolean;
        review: boolean;
        promotional: boolean;
        appUpdate: boolean;
        newFeature: boolean;
    };
    channels: {
        inApp: boolean;
        email: boolean;
        push: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}

const notificationPreferenceSchema = new Schema<INotificationPreference>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },

        categories: {
            booking: {
                type: Boolean,
                default: true,
            },

            payment: {
                type: Boolean,
                default: true,
            },

            query: {
                type: Boolean,
                default: true,
            },

            review: {
                type: Boolean,
                default: true,
            },

            promotional: {
                type: Boolean,
                default: true,
            },

            appUpdate: {
                type: Boolean,
                default: true,
            },

            newFeature: {
                type: Boolean,
                default: true,
            },
        },

        channels: {
            inApp: {
                type: Boolean,
                default: true,
            },

            email: {
                type: Boolean,
                default: true,
            },

            push: {
                type: Boolean,
                default: true,
            },
        },
    },
    {
        timestamps: true,
    },
);

export const NotificationPreference: Model<INotificationPreference> = model<INotificationPreference>("NotificationPreference", notificationPreferenceSchema);