import bcrypt from "bcrypt";
import mongoose, { Types } from "mongoose";
import { AdminApplication } from "../models/admin-application.model.js";
import { User } from "../models/user.model.js";
import { Counter } from "../models/counter.model.js";
import { Role } from "../types/rbac.js";
import { generateUniqueCode } from "../utils/generateUniqueCode.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";

export class AdminApplicationService {
    static async submit(input: {
        fullName: string;
        email: string;
        phoneNumber?: string;
        password: string;
    }) {
        const email = input.email.trim().toLowerCase();
        const phoneNumber = input.phoneNumber?.trim();

        const existingAdmin = await User.exists({
            role: Role.ADMIN,
            $or: [
                { email },
                ...(phoneNumber ? [{ phoneNumber }] : []),
            ],
        });

        if (existingAdmin) {
            throw new Error("Account already exists");
        }

        const existingApplication = await AdminApplication.exists({
            status: "PENDING",
            $or: [
                { email },
                ...(phoneNumber ? [{ phoneNumber }] : []),
            ],
        });

        if (existingApplication) {
            throw new Error("Application already pending");
        }

        const passwordHash = await bcrypt.hash(input.password, 10);

        const application = await AdminApplication.create({
            fullName: input.fullName.trim(),
            email,
            ...(phoneNumber && { phoneNumber }),
            passwordHash,
            status: "PENDING",
        });

        return {
            applicationId: application._id.toString(),
            status: application.status,
        };
    }

    static async list(status = "PENDING") {
        return AdminApplication.find({ status })
            .select("-passwordHash")
            .sort({ createdAt: -1 })
            .lean();
    }

    static async decide(applicationId: string, adminId: string, decision: "APPROVED" | "REJECTED") {
        if (!Types.ObjectId.isValid(applicationId) || !Types.ObjectId.isValid(adminId)) {
            throw new Error("Invalid ID");
        }

        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            const application = await AdminApplication.findOne({ _id: applicationId, status: "PENDING" })
                .select("+passwordHash")
                .session(session);

            if (!application) {
                throw new Error("Pending application not found");
            }

            let createdAdminId: Types.ObjectId | undefined;

            if (decision === "APPROVED") {
                const existing = await User.exists({
                    role: Role.ADMIN,
                    $or: [
                        { email: application.email },
                        ...(application.phoneNumber
                            ? [{ phoneNumber: application.phoneNumber }]
                            : []),
                    ],
                }).session(session);

                if (existing) {
                    throw new Error("Admin account already exists");
                }

                const counter = await Counter.findOneAndUpdate(
                    { id: "userId" },
                    { $inc: { seq: 1 } },
                    {
                        new: true,
                        upsert: true,
                        session,
                    },
                );

                if (!counter) {
                    throw new Error("Unable to generate user reference");
                }

                const [admin] = await User.create(
                    [
                        {
                            fullName: application.fullName,
                            email: application.email,
                            ...(application.phoneNumber && {
                                phoneNumber: application.phoneNumber,
                            }),
                            password: application.passwordHash,
                            role: Role.ADMIN,
                            rbacRoles: [],
                            isOtpVerified: true,
                            isComplete: true,
                            isActive: true,
                            userReference: `GX-${counter.seq
                                .toString()
                                .padStart(4, "0")}`,
                            referralCode: `REF-${generateUniqueCode()}`,
                        },
                    ],
                    { session },
                );

                if (!admin) {
                    throw new Error("Failed to create admin");
                }

                createdAdminId = admin._id;
                application.adminId = createdAdminId;
            }

            application.status = decision;
            application.decidedBy = new Types.ObjectId(adminId);
            application.decidedAt = new Date();

            // No longer retain the application password hash.
            application.passwordHash = undefined as never;

            await application.save({ session });
            await session.commitTransaction();

            if (createdAdminId) {
                try {
                    await RedisCacheService.deleteByPattern(
                        CacheKeys.userListPattern(),
                    );
                } catch (error) {
                    console.error("Admin cache invalidation failed", error);
                }
            }

            return {
                applicationId: application._id.toString(),
                status: application.status,
                adminId: createdAdminId?.toString() ?? null,
            };
        } catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        } finally {
            await session.endSession();
        }
    }
}
