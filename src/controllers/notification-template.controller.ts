import type {
    Request,
    Response,
} from "express";

import {
    NotificationTemplateService,
} from "../services/notification-template.service.js";

import type {
    NotificationType,
} from "../models/notification.model.js";
import type { NotificationCategory, NotificationPreferenceMode } from "../models/notification-template.model.js";

export const createNotificationTemplate =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const template =
                await NotificationTemplateService
                    .createTemplate({
                        ...req.body,

                        type:
                            req.body.type as NotificationType,

                        category:
                            req.body.category as NotificationCategory,

                        ...(req.body.preferenceMode && {
                            preferenceMode:
                                req.body
                                    .preferenceMode as NotificationPreferenceMode,
                        }),
                    });
            return res.status(201).json({
                success: true,
                message:
                    "Notification template created successfully",
                data: template,
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to create notification template",
            });
        }
    };

export const getNotificationTemplates =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const result =
                await NotificationTemplateService
                    .getTemplates({
                        ...(req.query.page && {
                            page:
                                Number(
                                    req.query.page,
                                ),
                        }),

                        ...(req.query.limit && {
                            limit:
                                Number(
                                    req.query.limit,
                                ),
                        }),

                        ...(typeof req.query.type ===
                            "string" && {
                            type:
                                req.query
                                    .type as NotificationType,
                        }),

                        ...(typeof req.query.category ===
                            "string" && {
                            category:
                                req.query
                                    .category as NotificationCategory,
                        }),

                        ...(req.query.isActive !==
                            undefined && {
                            isActive:
                                req.query.isActive ===
                                "true",
                        }),
                    });

            return res.status(200).json({
                success: true,
                message:
                    "Notification templates fetched successfully",
                data: result,
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch notification templates",
            });
        }
    };

export const getNotificationTemplateById =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const templateId =
                req.params.id;

            if (!templateId || Array.isArray(templateId)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid template ID is required",
                });
            }

            const template =
                await NotificationTemplateService
                    .getTemplateById(
                        templateId,
                    );

            return res.status(200).json({
                success: true,
                message:
                    "Notification template fetched successfully",
                data: template,
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch notification template",
            });
        }
    };

export const updateNotificationTemplate =
    async (
        req: Request,
        res: Response,
    ) => {
        try {
            const templateId =
                req.params.id;

            const template =
                await NotificationTemplateService
                    .updateTemplate({
                        templateId,
                        ...req.body,
                    });

            return res.status(200).json({
                success: true,
                message:
                    "Notification template updated successfully",
                data: template,
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to update notification template",
            });
        }
    };