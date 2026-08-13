import type {
    Request,
    Response,
} from "express";

import {
    NotificationPreferenceService,
} from "../services/notification-preference.service.js";

export const getMyNotificationPreferences =
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

            const preference =
                await NotificationPreferenceService
                    .getOrCreatePreferences(
                        userId,
                    );

            return res.status(200).json({
                success: true,

                message:
                    "Notification preferences fetched successfully",

                data:
                    preference,
            });
        } catch (error) {
            console.error(
                "Get notification preferences error:",
                error,
            );

            return res.status(500).json({
                success: false,

                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch notification preferences",
            });
        }
    };

export const updateMyNotificationPreferences =
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

            const {
                categories,
                channels,
            } = req.body;

            const preference =
                await NotificationPreferenceService
                    .updatePreferences({
                        userId,

                        ...(categories && {
                            categories,
                        }),

                        ...(channels && {
                            channels,
                        }),
                    });

            return res.status(200).json({
                success: true,

                message:
                    "Notification preferences updated successfully",

                data:
                    preference,
            });
        } catch (error) {
            console.error(
                "Update notification preferences error:",
                error,
            );

            return res.status(500).json({
                success: false,

                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to update notification preferences",
            });
        }
    };