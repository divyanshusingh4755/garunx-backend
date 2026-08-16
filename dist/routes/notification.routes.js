import { Router } from "express";
import { body, param, query, } from "express-validator";
import { getMyNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification, sendAdminNotification, retryNotificationEmail, retryNotificationPush, } from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { requirePermission } from "../middleware/rbac.js";
import { Role } from "../types/rbac.js";
import { validate } from "../utils/validate.js";
import { NOTIFICATION_TYPES } from "../models/notification.model.js";
import { createNotificationTemplate, getNotificationTemplateById, getNotificationTemplates, updateNotificationTemplate } from "../controllers/notification-template.controller.js";
import { DEVICE_PLATFORMS } from "../models/notification-device.model.js";
import { registerNotificationDevice, unregisterNotificationDevice } from "../controllers/notification-device.controller.js";
import { getMyNotificationPreferences, updateMyNotificationPreferences } from "../controllers/notification-preference.controller.js";
import { NOTIFICATION_CATEGORIES, NOTIFICATION_PREFERENCE_MODES } from "../models/notification-template.model.js";
const router = Router();
/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/
const getMyNotificationsValidation = [
    query("page")
        .optional()
        .isInt({
        min: 1,
    })
        .withMessage("Page must be a positive integer")
        .toInt(),
    query("limit")
        .optional()
        .isInt({
        min: 1,
        max: 100,
    })
        .withMessage("Limit must be between 1 and 100")
        .toInt(),
    query("isRead")
        .optional()
        .isBoolean()
        .withMessage("isRead must be a boolean"),
    query("type")
        .optional()
        .isIn(NOTIFICATION_TYPES)
        .withMessage("Invalid notification type"),
    validate,
];
const notificationIdValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid notification ID"),
    validate,
];
const sendAdminNotificationValidation = [
    body("title")
        .exists({
        checkFalsy: true,
    })
        .withMessage("Title is required")
        .isString()
        .withMessage("Title must be a string")
        .trim()
        .isLength({
        max: 200,
    })
        .withMessage("Title cannot exceed 200 characters"),
    body("message")
        .exists({
        checkFalsy: true,
    })
        .withMessage("Message is required")
        .isString()
        .withMessage("Message must be a string")
        .trim()
        .isLength({
        max: 2000,
    })
        .withMessage("Message cannot exceed 2000 characters"),
    body("type")
        .exists({
        checkFalsy: true,
    })
        .withMessage("Notification type is required")
        .isIn(NOTIFICATION_TYPES)
        .withMessage("Invalid notification type"),
    body("audience")
        .exists({
        checkFalsy: true,
    })
        .withMessage("Audience is required")
        .isIn([
        "ALL",
        ...Object.values(Role),
    ])
        .withMessage("Invalid notification audience"),
    body("referenceId")
        .optional()
        .isMongoId()
        .withMessage("Invalid reference ID"),
    validate,
];
const createNotificationTemplateValidation = [
    body("code")
        .exists({
        checkFalsy: true,
    })
        .withMessage("Template code is required")
        .isString()
        .withMessage("Template code must be a string")
        .trim()
        .isLength({
        max: 100,
    })
        .withMessage("Template code cannot exceed 100 characters"),
    body("type")
        .exists({
        checkFalsy: true,
    })
        .withMessage("Notification type is required")
        .isIn(NOTIFICATION_TYPES)
        .withMessage("Invalid notification type"),
    body("category")
        .exists({
        checkFalsy: true,
    })
        .withMessage("Notification category is required")
        .isIn(NOTIFICATION_CATEGORIES)
        .withMessage("Invalid notification category"),
    body("preferenceMode")
        .optional()
        .isIn(NOTIFICATION_PREFERENCE_MODES)
        .withMessage("Invalid notification preference mode"),
    body("title")
        .exists({
        checkFalsy: true,
    })
        .withMessage("Title is required")
        .isString()
        .withMessage("Title must be a string")
        .trim()
        .isLength({
        max: 200,
    })
        .withMessage("Title cannot exceed 200 characters"),
    body("message")
        .exists({
        checkFalsy: true,
    })
        .withMessage("Message is required")
        .isString()
        .withMessage("Message must be a string")
        .trim()
        .isLength({
        max: 2000,
    })
        .withMessage("Message cannot exceed 2000 characters"),
    body("emailSubject")
        .optional()
        .isString()
        .withMessage("Email subject must be a string")
        .trim()
        .isLength({
        max: 200,
    })
        .withMessage("Email subject cannot exceed 200 characters"),
    body("emailBody")
        .optional()
        .isString()
        .withMessage("Email body must be a string"),
    body("pushTitle")
        .optional()
        .isString()
        .withMessage("Push title must be a string")
        .trim()
        .isLength({
        max: 200,
    })
        .withMessage("Push title cannot exceed 200 characters"),
    body("pushMessage")
        .optional()
        .isString()
        .withMessage("Push message must be a string")
        .trim()
        .isLength({
        max: 2000,
    })
        .withMessage("Push message cannot exceed 2000 characters"),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
    validate,
];
const updateNotificationTemplateValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid notification template ID"),
    body().custom((value) => {
        if (!value ||
            typeof value !== "object" ||
            Array.isArray(value)) {
            throw new Error("Request body must be an object");
        }
        const allowedFields = [
            "code",
            "type",
            "category",
            "preferenceMode",
            "title",
            "message",
            "emailSubject",
            "emailBody",
            "pushTitle",
            "pushMessage",
            "isActive",
        ];
        const suppliedFields = Object.keys(value);
        if (suppliedFields.length === 0) {
            throw new Error("At least one update field is required");
        }
        const invalidFields = suppliedFields.filter((field) => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid update fields: ${invalidFields.join(", ")}`);
        }
        return true;
    }),
    body("code")
        .optional()
        .isString()
        .withMessage("Template code must be a string")
        .trim()
        .notEmpty()
        .withMessage("Template code cannot be empty")
        .isLength({
        max: 100,
    })
        .withMessage("Template code cannot exceed 100 characters"),
    body("type")
        .optional()
        .isIn(NOTIFICATION_TYPES)
        .withMessage("Invalid notification type"),
    body("category")
        .optional()
        .isIn(NOTIFICATION_CATEGORIES)
        .withMessage("Invalid notification category"),
    body("preferenceMode")
        .optional()
        .isIn(NOTIFICATION_PREFERENCE_MODES)
        .withMessage("Invalid notification preference mode"),
    body("title")
        .optional()
        .isString()
        .withMessage("Title must be a string")
        .trim()
        .notEmpty()
        .withMessage("Title cannot be empty")
        .isLength({
        max: 200,
    })
        .withMessage("Title cannot exceed 200 characters"),
    body("message")
        .optional()
        .isString()
        .withMessage("Message must be a string")
        .trim()
        .notEmpty()
        .withMessage("Message cannot be empty")
        .isLength({
        max: 2000,
    })
        .withMessage("Message cannot exceed 2000 characters"),
    body("emailSubject")
        .optional()
        .isString()
        .withMessage("Email subject must be a string")
        .trim()
        .isLength({
        max: 200,
    })
        .withMessage("Email subject cannot exceed 200 characters"),
    body("emailBody")
        .optional()
        .isString()
        .withMessage("Email body must be a string"),
    body("pushTitle")
        .optional()
        .isString()
        .withMessage("Push title must be a string")
        .trim()
        .isLength({
        max: 200,
    })
        .withMessage("Push title cannot exceed 200 characters"),
    body("pushMessage")
        .optional()
        .isString()
        .withMessage("Push message must be a string")
        .trim()
        .isLength({
        max: 2000,
    })
        .withMessage("Push message cannot exceed 2000 characters"),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
    validate,
];
const notificationTemplateIdValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid notification template ID"),
    validate,
];
const getNotificationTemplatesValidation = [
    query("page")
        .optional()
        .isInt({
        min: 1,
    })
        .withMessage("Page must be a positive integer")
        .toInt(),
    query("limit")
        .optional()
        .isInt({
        min: 1,
        max: 100,
    })
        .withMessage("Limit must be between 1 and 100")
        .toInt(),
    query("type")
        .optional()
        .isIn(NOTIFICATION_TYPES)
        .withMessage("Invalid notification type"),
    query("category")
        .optional()
        .isIn(NOTIFICATION_CATEGORIES)
        .withMessage("Invalid notification category"),
    query("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
    validate,
];
const registerNotificationDeviceValidation = [
    body("token")
        .exists({
        checkFalsy: true,
    })
        .withMessage("FCM token is required")
        .isString()
        .withMessage("FCM token must be a string")
        .trim(),
    body("platform")
        .exists({
        checkFalsy: true,
    })
        .withMessage("Platform is required")
        .isIn(DEVICE_PLATFORMS)
        .withMessage("Invalid device platform"),
    body("deviceId")
        .optional()
        .isString()
        .withMessage("Device ID must be a string")
        .trim()
        .isLength({
        max: 255,
    })
        .withMessage("Device ID cannot exceed 255 characters"),
    validate,
];
const unregisterNotificationDeviceValidation = [
    body("token")
        .exists({
        checkFalsy: true,
    })
        .withMessage("FCM token is required")
        .isString()
        .withMessage("FCM token must be a string")
        .trim(),
    validate,
];
const updateNotificationPreferencesValidation = [
    body("categories").custom((categories) => {
        if (!categories) {
            return true;
        }
        const allowedFields = [
            "booking",
            "payment",
            "query",
            "review",
            "promotional",
            "appUpdate",
            "newFeature",
        ];
        const invalidFields = Object.keys(categories).filter((field) => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid category fields: ${invalidFields.join(", ")}`);
        }
        return true;
    }),
    body("channels").custom((channels) => {
        if (!channels) {
            return true;
        }
        const allowedFields = [
            "inApp",
            "email",
            "push",
        ];
        const invalidFields = Object.keys(channels).filter((field) => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid channel fields: ${invalidFields.join(", ")}`);
        }
        return true;
    }),
    body("categories")
        .optional()
        .isObject()
        .withMessage("categories must be an object"),
    body("categories.booking")
        .optional()
        .isBoolean()
        .withMessage("categories.booking must be a boolean"),
    body("categories.payment")
        .optional()
        .isBoolean()
        .withMessage("categories.payment must be a boolean"),
    body("categories.query")
        .optional()
        .isBoolean()
        .withMessage("categories.query must be a boolean"),
    body("categories.review")
        .optional()
        .isBoolean()
        .withMessage("categories.review must be a boolean"),
    body("categories.promotional")
        .optional()
        .isBoolean()
        .withMessage("categories.promotional must be a boolean"),
    body("categories.appUpdate")
        .optional()
        .isBoolean()
        .withMessage("categories.appUpdate must be a boolean"),
    body("categories.newFeature")
        .optional()
        .isBoolean()
        .withMessage("categories.newFeature must be a boolean"),
    body("channels")
        .optional()
        .isObject()
        .withMessage("channels must be an object"),
    body("channels.inApp")
        .optional()
        .isBoolean()
        .withMessage("channels.inApp must be a boolean"),
    body("channels.email")
        .optional()
        .isBoolean()
        .withMessage("channels.email must be a boolean"),
    body("channels.push")
        .optional()
        .isBoolean()
        .withMessage("channels.push must be a boolean"),
    body().custom((value) => {
        if (!value ||
            typeof value !== "object" ||
            Array.isArray(value)) {
            throw new Error("Request body must be an object");
        }
        const allowedFields = [
            "categories",
            "channels",
        ];
        const suppliedFields = Object.keys(value);
        if (suppliedFields.length === 0) {
            throw new Error("At least one notification preference is required");
        }
        const invalidFields = suppliedFields.filter((field) => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid fields: ${invalidFields.join(", ")}`);
        }
        return true;
    }),
    validate,
];
/*
|--------------------------------------------------------------------------
| User Routes
|--------------------------------------------------------------------------
*/
// Notification list
router.get("/", authenticate, getMyNotificationsValidation, getMyNotifications);
// Unread count
router.get("/unread-count", authenticate, getUnreadCount);
// Preferences
router.get("/preferences", authenticate, getMyNotificationPreferences);
router.patch("/preferences", authenticate, updateNotificationPreferencesValidation, updateMyNotificationPreferences);
// Devices
router.post("/devices", authenticate, registerNotificationDeviceValidation, registerNotificationDevice);
router.delete("/devices", authenticate, unregisterNotificationDeviceValidation, unregisterNotificationDevice);
// Read all
router.patch("/read-all", authenticate, markAllAsRead);
/*
|--------------------------------------------------------------------------
| Admin Routes - Static / Collection
|--------------------------------------------------------------------------
*/
router.post("/admin/send", authenticate, authorizeRoles(Role.ADMIN), requirePermission("notifications.send"), sendAdminNotificationValidation, sendAdminNotification);
router.post("/admin/templates", authenticate, authorizeRoles(Role.ADMIN), requirePermission("notifications.manage_templates"), createNotificationTemplateValidation, createNotificationTemplate);
router.get("/admin/templates", authenticate, authorizeRoles(Role.ADMIN), requirePermission("notifications.manage_templates"), getNotificationTemplatesValidation, getNotificationTemplates);
/*
|--------------------------------------------------------------------------
| Admin Routes - Specific Notification Actions
|--------------------------------------------------------------------------
*/
router.post("/admin/:id/retry-push", authenticate, authorizeRoles(Role.ADMIN), requirePermission("notifications.send"), notificationIdValidation, retryNotificationPush);
router.post("/admin/:id/retry-email", authenticate, authorizeRoles(Role.ADMIN), requirePermission("notifications.send"), notificationIdValidation, retryNotificationEmail);
/*
|--------------------------------------------------------------------------
| Admin Routes - Template Detail / Update
|--------------------------------------------------------------------------
*/
router.get("/admin/templates/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("notifications.manage_templates"), notificationTemplateIdValidation, getNotificationTemplateById);
router.patch("/admin/templates/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("notifications.manage_templates"), updateNotificationTemplateValidation, updateNotificationTemplate);
/*
|--------------------------------------------------------------------------
| User Routes - Generic Notification ID
|--------------------------------------------------------------------------
*/
// Keep dynamic user notification routes at the bottom.
router.patch("/:id/read", authenticate, notificationIdValidation, markAsRead);
router.delete("/:id", authenticate, notificationIdValidation, deleteNotification);
export default router;
//# sourceMappingURL=notification.routes.js.map