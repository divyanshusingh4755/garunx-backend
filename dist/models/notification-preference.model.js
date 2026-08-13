import { model, Schema, Types, } from "mongoose";
export const NOTIFICATION_PREFERENCE_CATEGORIES = [
    "BOOKING",
    "PAYMENT",
    "QUERY",
    "REVIEW",
    "PROMOTIONAL",
    "APP_UPDATE",
    "NEW_FEATURE",
];
const notificationPreferenceSchema = new Schema({
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
}, {
    timestamps: true,
});
export const NotificationPreference = model("NotificationPreference", notificationPreferenceSchema);
//# sourceMappingURL=notification-preference.model.js.map