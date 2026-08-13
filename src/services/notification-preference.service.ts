import {
    Types,
} from "mongoose";

import {
    NotificationPreference,
} from "../models/notification-preference.model.js";

export class NotificationPreferenceService {
    static async getOrCreatePreferences(
        userId: string,
    ) {
        if (
            !Types.ObjectId.isValid(
                userId,
            )
        ) {
            throw new Error(
                "Invalid user ID",
            );
        }

        const preference =
            await NotificationPreference
                .findOneAndUpdate(
                    {
                        userId:
                            new Types.ObjectId(
                                userId,
                            ),
                    },
                    {
                        $setOnInsert: {
                            userId:
                                new Types.ObjectId(
                                    userId,
                                ),

                            categories: {
                                booking: true,
                                payment: true,
                                query: true,
                                review: true,
                                promotional: true,
                                appUpdate: true,
                                newFeature: true,
                            },

                            channels: {
                                inApp: true,
                                email: true,
                                push: true,
                            },
                        },
                    },
                    {
                        new: true,
                        upsert: true,
                        runValidators: true,
                    },
                );

        if (!preference) {
            throw new Error(
                "Failed to load notification preferences",
            );
        }

        return preference;
    }

    static async updatePreferences(params: {
        userId: string;

        categories?: {
            booking?: boolean;
            payment?: boolean;
            query?: boolean;
            review?: boolean;
            promotional?: boolean;
            appUpdate?: boolean;
            newFeature?: boolean;
        };

        channels?: {
            inApp?: boolean;
            email?: boolean;
            push?: boolean;
        };
    }) {
        const {
            userId,
            categories,
            channels,
        } = params;

        if (
            !Types.ObjectId.isValid(
                userId,
            )
        ) {
            throw new Error(
                "Invalid user ID",
            );
        }

        const updateData:
            Record<string, boolean> = {};

        if (categories) {
            if (
                typeof categories.booking ===
                "boolean"
            ) {
                updateData[
                    "categories.booking"
                ] =
                    categories.booking;
            }

            if (
                typeof categories.payment ===
                "boolean"
            ) {
                updateData[
                    "categories.payment"
                ] =
                    categories.payment;
            }

            if (
                typeof categories.query ===
                "boolean"
            ) {
                updateData[
                    "categories.query"
                ] =
                    categories.query;
            }

            if (
                typeof categories.review ===
                "boolean"
            ) {
                updateData[
                    "categories.review"
                ] =
                    categories.review;
            }

            if (
                typeof categories.promotional ===
                "boolean"
            ) {
                updateData[
                    "categories.promotional"
                ] =
                    categories.promotional;
            }

            if (
                typeof categories.appUpdate ===
                "boolean"
            ) {
                updateData[
                    "categories.appUpdate"
                ] =
                    categories.appUpdate;
            }

            if (
                typeof categories.newFeature ===
                "boolean"
            ) {
                updateData[
                    "categories.newFeature"
                ] =
                    categories.newFeature;
            }
        }

        if (channels) {
            if (
                typeof channels.inApp ===
                "boolean"
            ) {
                updateData[
                    "channels.inApp"
                ] =
                    channels.inApp;
            }

            if (
                typeof channels.email ===
                "boolean"
            ) {
                updateData[
                    "channels.email"
                ] =
                    channels.email;
            }

            if (
                typeof channels.push ===
                "boolean"
            ) {
                updateData[
                    "channels.push"
                ] =
                    channels.push;
            }
        }

        /*
         * Make sure the preference document exists first.
         */
        await this.getOrCreatePreferences(
            userId,
        );

        if (
            Object.keys(
                updateData,
            ).length === 0
        ) {
            return this
                .getOrCreatePreferences(
                    userId,
                );
        }

        const preference =
            await NotificationPreference
                .findOneAndUpdate(
                    {
                        userId:
                            new Types.ObjectId(
                                userId,
                            ),
                    },
                    {
                        $set:
                            updateData,
                    },
                    {
                        new: true,
                        runValidators: true,
                    },
                );

        if (!preference) {
            throw new Error(
                "Notification preferences not found",
            );
        }

        return preference;
    }
}