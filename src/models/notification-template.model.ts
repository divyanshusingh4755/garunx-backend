import {
    model,
    Schema,
    type Document,
    type Model,
} from "mongoose";

import {
    NOTIFICATION_TYPES,
    type NotificationType,
} from "./notification.model.js";

export const NOTIFICATION_CATEGORIES = [
    "BOOKING",
    "PAYMENT",
    "QUERY",
    "REVIEW",
    "PROMOTIONAL",
    "APP_UPDATE",
    "NEW_FEATURE",
    "SYSTEM",
] as const;

export type NotificationCategory =
    (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_PREFERENCE_MODES = [
    "REQUIRED",
    "OPTIONAL",
] as const;

export type NotificationPreferenceMode =
    (typeof NOTIFICATION_PREFERENCE_MODES)[number];

export interface INotificationTemplate
    extends Document {
    code: string;

    type: NotificationType;

    category: NotificationCategory;

    preferenceMode: NotificationPreferenceMode;

    title: string;

    message: string;

    emailSubject?: string;

    emailBody?: string;

    pushTitle?: string;

    pushMessage?: string;

    isActive: boolean;

    createdAt: Date;

    updatedAt: Date;
}

const notificationTemplateSchema =
    new Schema<INotificationTemplate>(
        {
            code: {
                type: String,
                required: true,
                unique: true,
                trim: true,
                uppercase: true,
            },

            type: {
                type: String,
                enum: NOTIFICATION_TYPES,
                required: true,
                index: true,
            },

            category: {
                type: String,
                enum: NOTIFICATION_CATEGORIES,
                required: true,
                index: true,
            },

            preferenceMode: {
                type: String,
                enum: NOTIFICATION_PREFERENCE_MODES,
                default: "OPTIONAL",
                required: true,
            },

            title: {
                type: String,
                required: true,
                trim: true,
                maxlength: 200,
            },

            message: {
                type: String,
                required: true,
                trim: true,
                maxlength: 2000,
            },

            emailSubject: {
                type: String,
                trim: true,
                maxlength: 200,
            },

            emailBody: {
                type: String,
            },

            pushTitle: {
                type: String,
                trim: true,
                maxlength: 200,
            },

            pushMessage: {
                type: String,
                trim: true,
                maxlength: 2000,
            },

            isActive: {
                type: Boolean,
                default: true,
                index: true,
            },
        },
        {
            timestamps: true,
        },
    );

export const NotificationTemplate:
    Model<INotificationTemplate> =
    model<INotificationTemplate>(
        "NotificationTemplate",
        notificationTemplateSchema,
    );