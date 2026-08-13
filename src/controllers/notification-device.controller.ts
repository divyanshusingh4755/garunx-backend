import type {
    Request,
    Response,
} from "express";

import {
    NotificationDeviceService,
} from "../services/notification-device.service.js";

import type {
    DevicePlatform,
} from "../models/notification-device.model.js";

export const registerNotificationDevice =
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
                token,
                platform,
                deviceId,
            } = req.body;

            const device =
                await NotificationDeviceService
                    .registerDevice({
                        userId,
                        token,

                        platform:
                            platform as DevicePlatform,

                        ...(deviceId && {
                            deviceId,
                        }),
                    });

            return res.status(200).json({
                success: true,

                message:
                    "Notification device registered successfully",

                data: device,
            });
        } catch (error) {
            console.error(
                "Register notification device error:",
                error,
            );

            return res.status(500).json({
                success: false,

                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to register notification device",
            });
        }
    };

export const unregisterNotificationDevice =
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
                token,
            } = req.body;

            const device =
                await NotificationDeviceService
                    .deactivateDevice({
                        userId,
                        token,
                    });

            return res.status(200).json({
                success: true,

                message:
                    "Notification device unregistered successfully",

                data: device,
            });
        } catch (error) {
            console.error(
                "Unregister notification device error:",
                error,
            );

            return res.status(500).json({
                success: false,

                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to unregister notification device",
            });
        }
    };