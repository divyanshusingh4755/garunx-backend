import type {
    Request,
    Response,
} from "express";

import { NotificationService } from "../services/notification.service.js";

import type { NotificationType } from "../models/notification.model.js";

import { Role } from "../types/rbac.js";

export const getMyNotifications =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const userId =
                req.user?.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            const page =
                req.query.page
                    ? Number(
                        req.query.page,
                    )
                    : undefined;

            const limit =
                req.query.limit
                    ? Number(
                        req.query.limit,
                    )
                    : undefined;

            const isRead =
                req.query.isRead !==
                    undefined
                    ? req.query.isRead ===
                    "true"
                    : undefined;

            const type =
                typeof req.query.type ===
                    "string"
                    ? (req.query
                        .type as NotificationType)
                    : undefined;

            const result =
                await NotificationService.getMyNotifications(
                    {
                        userId,

                        ...(page !==
                            undefined && {
                            page,
                        }),

                        ...(limit !==
                            undefined && {
                            limit,
                        }),

                        ...(isRead !==
                            undefined && {
                            isRead,
                        }),

                        ...(type && {
                            type,
                        }),
                    },
                );

            return res.status(200).json({
                success: true,

                message:
                    "Notifications fetched successfully",

                data: result,
            });
        } catch (error) {
            console.error(
                "Get notifications error:",
                error,
            );

            return res.status(500).json({
                success: false,

                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch notifications",
            });
        }
    };

export const getUnreadCount =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const userId =
                req.user?.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            const result =
                await NotificationService.getUnreadCount(
                    userId,
                );

            return res.status(200).json({
                success: true,

                message:
                    "Unread notification count fetched successfully",

                data: result,
            });
        } catch (error) {
            console.error(
                "Get unread count error:",
                error,
            );

            return res.status(500).json({
                success: false,

                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch unread count",
            });
        }
    };

export const markAsRead =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const userId =
                req.user?.userId;

            const notificationId =
                req.params.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            if (!notificationId || Array.isArray(notificationId)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid Notification ID is required",
                });
            }

            const notification =
                await NotificationService.markAsRead(
                    {
                        notificationId,
                        userId,
                    },
                );

            return res.status(200).json({
                success: true,

                message:
                    "Notification marked as read successfully",

                data: notification,
            });
        } catch (error) {
            console.error(
                "Mark notification as read error:",
                error,
            );

            return res.status(500).json({
                success: false,

                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to mark notification as read",
            });
        }
    };

export const markAllAsRead =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const userId =
                req.user?.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            const result =
                await NotificationService.markAllAsRead(
                    userId,
                );

            return res.status(200).json({
                success: true,

                message:
                    "All notifications marked as read successfully",

                data: result,
            });
        } catch (error) {
            console.error(
                "Mark all notifications as read error:",
                error,
            );

            return res.status(500).json({
                success: false,

                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to mark all notifications as read",
            });
        }
    };

export const deleteNotification =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const userId =
                req.user?.userId;

            const notificationId =
                req.params.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            if (!notificationId || Array.isArray(notificationId)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid Notification ID is required",
                });
            }

            const result =
                await NotificationService.deleteNotification(
                    {
                        notificationId,
                        userId,
                    },
                );

            return res.status(200).json({
                success: true,

                message:
                    "Notification deleted successfully",

                data: result,
            });
        } catch (error) {
            console.error(
                "Delete notification error:",
                error,
            );

            return res.status(500).json({
                success: false,

                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to delete notification",
            });
        }
    };

export const sendAdminNotification =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const {
                title,
                message,
                type,
                audience,
                referenceId,
            } = req.body;

            const result =
                await NotificationService.sendAdminNotification(
                    {
                        title,

                        message,

                        type:
                            type as NotificationType,

                        audience:
                            audience as
                            | "ALL"
                            | Role,

                        ...(referenceId && {
                            referenceId,
                        }),
                    },
                );

            return res.status(201).json({
                success: true,

                message:
                    "Notification sent successfully",

                data: result,
            });
        } catch (error) {
            console.error(
                "Send admin notification error:",
                error,
            );

            return res.status(500).json({
                success: false,

                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to send notification",
            });
        }
    };

export const retryNotificationEmail =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const notificationId =
                req.params.id;

            if (
                !notificationId ||
                Array.isArray(
                    notificationId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Valid notification ID is required",
                });
            }

            const result =
                await NotificationService
                    .retryEmail(
                        notificationId,
                    );

            return res.status(200).json({
                success: true,
                message:
                    "Notification email retried successfully",
                data: result,
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to retry notification email",
            });
        }
    };

export const retryNotificationPush =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const notificationId =
                req.params.id;

            if (
                !notificationId ||
                Array.isArray(
                    notificationId,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Valid notification ID is required",
                });
            }

            const result =
                await NotificationService
                    .retryPush(
                        notificationId,
                    );

            return res.status(200).json({
                success: true,

                message:
                    "Push notification retried successfully",

                data: result,
            });
        } catch (error) {
            console.error(
                "Retry push notification error:",
                error,
            );

            return res.status(500).json({
                success: false,

                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to retry push notification",
            });
        }
    };