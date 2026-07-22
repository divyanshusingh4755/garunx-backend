import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";
import { Role } from "../types/rbac.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { Session } from "../models/session.model.js";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { generateUniqueCode } from "../utils/generateUniqueCode.js";
import { ApprovalStatus, AvailabilityStatus, VerificationStatus } from "../types/enums.js";
import { escapeRegex } from "../utils/escapeRegex.js";
class AuthService {
    static async generateUserSession(user, userAgent, ip, mongoSession) {
        const familyId = crypto.randomUUID();
        const accessToken = jwt.sign({
            userId: user._id,
            role: user.role,
        }, process.env.JWT_ACCESS_SECRET, {
            expiresIn: "15m",
        });
        const refreshToken = jwt.sign({
            userId: user._id,
            familyId,
        }, process.env.JWT_REFRESH_SECRET, {
            expiresIn: "30d",
        });
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const query = Session.findOneAndUpdate({
            userId: user._id,
            deviceInfo: userAgent || "unknown",
        }, {
            refreshToken,
            familyId,
            expiresAt,
            ...(ip && { ipAddress: ip }),
        }, {
            upsert: true,
            new: true,
        });
        if (mongoSession) {
            query.session(mongoSession);
        }
        await query;
        const userObject = user.toObject();
        delete userObject.password;
        return {
            user: userObject,
            accessToken,
            refreshToken,
        };
    }
    static async registerUser(role, password, userEmail, phoneNumber) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            let finalEmail = userEmail?.toLowerCase();
            let finalNumber = phoneNumber;
            const query = [];
            if (finalEmail)
                query.push({ email: finalEmail, role: role });
            if (finalNumber)
                query.push({ phoneNumber: finalNumber, role: role });
            if (query.length === 0) {
                throw new Error("Email or Phone Number is required for registration.");
            }
            const existingUser = await User.findOne({ $or: query }).session(session);
            // Block only if the registration journey is 100% finished
            if (existingUser && existingUser.isComplete) {
                throw new Error(`You are already a registered ${role}. Please login instead.`);
            }
            // Hash Password
            let hashedPassword;
            if (password) {
                const salt = await bcrypt.genSalt(10);
                hashedPassword = await bcrypt.hash(password, salt);
            }
            // Generate OTP only if NOT a social login
            const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
            const filter = existingUser ? { _id: existingUser._id } : { $or: query };
            // Upsert User (Update unverified or create new)
            const user = (await User.findOneAndUpdate(filter, {
                role,
                otp: generatedOtp,
                otpExpiresAt,
                isOtpVerified: false, // Always false for manual registration until OTP check
                ...(finalNumber && { phoneNumber: finalNumber }),
                ...(finalEmail && { email: finalEmail }),
                ...(hashedPassword && { password: hashedPassword }),
                $setOnInsert: {
                    referralCode: `REF-${generateUniqueCode()}`,
                    isComplete: false,
                },
            }, { session, upsert: true, new: true, runValidators: true }));
            await session.commitTransaction();
            return user;
        }
        catch (error) {
            await session.abortTransaction();
            if (error.code === 11000) {
                throw new Error("A verified user this phone number or email is already exists.");
            }
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    static async socialAuth(role, email, userAgent, ip) {
        try {
            const user = await User.findOneAndUpdate({ role, email }, {
                $set: { isOtpVerified: true },
                $setOnInsert: {
                    isComplete: false,
                    referralCode: `REF-${generateUniqueCode()}`,
                },
            }, {
                new: true,
                upsert: true,
                runValidators: true,
            });
            if (!user.isActive)
                throw new Error("Account is deactivated");
            const sessionData = await this.generateUserSession(user, userAgent, ip);
            return { ...sessionData, isNewUser: !user.isComplete };
        }
        catch (error) {
            if (error.code === 11000) {
                throw new Error("An account with this email already exists.");
            }
            throw error;
        }
    }
    static async verifyOtp(userId, otp, email) {
        if (userId) {
            // Find OTP in DB
            const user = await User.findById(userId);
            if (!user)
                throw new Error("User not found.");
            if (!user.otp)
                throw new Error("No OTP was requested for this account.");
            // Check Expiry
            if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
                // Clear expired OTP to keep DB clean
                user.otp = null;
                user.otpExpiresAt = null;
                await user.save();
                throw new Error("OTP has expired. Please request a new one.");
            }
            if (user.otp !== otp) {
                throw new Error("Invalid OTP.");
            }
            // Success
            user.isOtpVerified = true;
            user.otp = null; // Clear it
            user.otpExpiresAt = null;
            await user.save();
            return user;
        }
        if (email) {
            // hash the incoming token to match
            const hashedToken = crypto.createHash("sha256").update(otp).digest("hex");
            // Find user with valid token
            const user = await User.findOne({
                email: email,
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
            });
            if (!user) {
                throw new Error("OTP is invalid or has expired");
            }
            if (user.resetPasswordToken) {
                user.isResetVerified = true;
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;
            }
            user.isOtpVerified = true;
            await user.save();
            return user;
        }
        throw new Error("Invalid verification type.");
    }
    static async resendOtp(userId, email) {
        const expiryTime = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        if (userId) {
            // Find the specific document by ID
            const user = await User.findById(userId);
            if (!user)
                throw new Error("User not found. Please restart registration.");
            // Safety check: Don't resend if they already finished everything
            if (user.isComplete) {
                throw new Error("Account is already fully registered. Please login instead.");
            }
            // Update the existing document with new OTP
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otp = newOtp;
            user.otpExpiresAt = expiryTime;
            user.isOtpVerified = false;
            await user.save();
            // Trigger your SMS provider here (using user.phoneNumber)
            console.log(`Resending OTP ${newOtp} to ${user.phoneNumber}`);
            return {
                success: true,
                message: "OTP resent successfully via SMS",
                otp: newOtp,
            };
        }
        if (email) {
            // Find the specific document by ID
            const user = await User.findOne({ email });
            if (!user)
                throw new Error("User not found. Please restart registration.");
            // Generate 6-digit OTP
            // const otp = crypto.randomInt(100000, 1000000).toString();
            // For testing
            const otp = "111111";
            // Save to user document (using your existing 15-min expiry logic)
            const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
            user.resetPasswordToken = hashedOtp;
            user.resetPasswordExpires = expiryTime;
            user.isResetVerified = false;
            await user.save();
            // const { email, role } = user;
            // // Configure Mailer
            // const transporter = nodemailer.createTransport({
            //     service: "gmail",
            //     auth: {
            //         user: process.env.EMAIL_USER,
            //         pass: process.env.EMAIL_PASS
            //     }
            // });
            // const mailOptions = {
            //     from: process.env.EMAIL_USER,
            //     to: email,
            //     subject: `Reset Password Code for ${role}`,
            //     html: `
            //     <div style="font-family: sans-serif; padding: 20px;">
            //         <h3>Password Reset Request</h3>
            //         <p>You requested to reset your password for your <b>${role}</b> account.</p>
            //         <p>Your 6-digit verification code is: <h2 style="color: #007bff;">${otp}</h2></p>
            //         <p>This code will expire in 15 minutes.</p>
            //         <p>If you didn't request this, please ignore this email.</p>
            //     </div>
            // `
            // };
            // await transporter.sendMail(mailOptions);
            return {
                success: true,
                message: "Reset code sent to your email",
                otp: otp,
            };
        }
        throw new Error("Invalid resend type.");
    }
    static async loginUser(identifier, role, password, userAgent, ip) {
        if (!password) {
            throw new Error("Password is required for manual login");
        }
        const user = (await User.findOne({
            role,
            $or: [{ email: identifier.toLowerCase() }, { phoneNumber: identifier }],
        }).select("+password"));
        if (!user || !user.password)
            throw new Error("Invalid Credentials");
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            throw new Error("Invalid credentials");
        // Status & Completeness Checks
        if (!user.isActive)
            throw new Error("Account is deactivated");
        if (!user.isOtpVerified)
            throw new Error("Please verify your account first.");
        if (!user.isComplete)
            throw new Error("Registration incomplete. Please finish setting up your profile.");
        const sessionData = await this.generateUserSession(user, userAgent, ip);
        return sessionData;
    }
    static async refreshAccesToken(oldRefreshToken, userAgent, ip) {
        try {
            // Verify JWT string
            const decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);
            // Find the session
            const session = await Session.findOne({ refreshToken: oldRefreshToken });
            // Reuse detection: if token not found, someone might have stolen and used it already!
            if (!session) {
                await Session.deleteMany({ familyId: decoded.familyId });
                throw new Error("Security Alert: Refresh token reuse detected. All sessions revoked");
            }
            // Generate New Pair
            const user = await User.findById(decoded.userId);
            if (!user || !user.isActive)
                throw new Error("User inactive or not found.");
            const newAccessToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
            const newRefreshToken = jwt.sign({ userId: user._id, familyId: decoded.familyId }, process.env.JWT_REFRESH_SECRET, { expiresIn: "30d" });
            // Rotation: Replace old token with the new one in the same session document
            session.refreshToken = newRefreshToken;
            session.deviceInfo = userAgent;
            session.ipAddress = ip ?? session.ipAddress ?? "unknown";
            // keep the same family Id so we can track the lineage
            await session.save();
            return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        }
        catch (error) {
            if (error.name === "TokenExpiredError") {
                await Session.deleteOne({ refreshToken: oldRefreshToken });
            }
            throw new Error(error.message || "Inavlid refresh token");
        }
    }
    static async logoutUser(refreshToken, allDevices = false) {
        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            if (allDevices && decoded.userId) {
                await Session.deleteMany({ userId: decoded.userId });
            }
            else {
                await Session.deleteOne({ refreshToken });
            }
            return { success: true };
        }
        catch (error) {
            await Session.deleteOne({ refreshToken });
            return { success: true };
        }
    }
    static async forgotPassword(email, role) {
        try {
            //Find specific user for this email AND role
            const user = await User.findOne({ email: email.toLowerCase(), role });
            if (!user) {
                throw new Error(`No ${role} account found with this email.`);
            }
            // Generate 6-digit OTP
            // const otp = crypto.randomInt(100000, 1000000).toString();
            // For testing
            const otp = "111111";
            // Save to user document (using your existing 15-min expiry logic)
            const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
            user.resetPasswordToken = hashedOtp;
            user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
            user.isResetVerified = false;
            await user.save();
            // // Configure Mailer
            // const transporter = nodemailer.createTransport({
            //     service: "gmail",
            //     auth: {
            //         user: process.env.EMAIL_USER,
            //         pass: process.env.EMAIL_PASS
            //     }
            // });
            // const mailOptions = {
            //     from: process.env.EMAIL_USER,
            //     to: email,
            //     subject: `Reset Password Code for ${role}`,
            //     html: `
            //     <div style="font-family: sans-serif; padding: 20px;">
            //         <h3>Password Reset Request</h3>
            //         <p>You requested to reset your password for your <b>${role}</b> account.</p>
            //         <p>Your 6-digit verification code is: <h2 style="color: #007bff;">${otp}</h2></p>
            //         <p>This code will expire in 15 minutes.</p>
            //         <p>If you didn't request this, please ignore this email.</p>
            //     </div>
            // `
            // };
            // await transporter.sendMail(mailOptions);
            return {
                success: true,
                otp: otp,
                message: "Reset code sent to your email",
            };
        }
        catch (error) {
            throw new Error(error.message || "Failed to send reset email");
        }
    }
    static async resetPassword(userId, newPassword) {
        const user = await User.findOne({
            _id: userId,
            isResetVerified: true,
            resetPasswordExpires: { $gt: new Date() },
        });
        if (!user) {
            throw new Error("Action unauthorized or session expired. Please verify your OTP again.");
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.isResetVerified = false;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        // security: Invalidate all existing sessions
        await Session.deleteMany({ userId: user._id });
        return { success: true, message: "Password updated sucessfully" };
    }
    static async changePassword(userId, oldPassword, newPassword) {
        // Find user with valid token
        const user = await User.findOne({ _id: userId });
        if (!user) {
            throw new Error("User not found");
        }
        if (!user.password) {
            throw new Error("Password not set for this account (Social Login?)");
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch)
            throw new Error("Invalid Current Password");
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword)
            throw new Error("New password cannot be the same as the old one");
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        // security: Invalidate all existing sessions
        await Session.deleteMany({ userId: user._id });
        return { success: true, message: "Password updated sucessfully" };
    }
    static async GetAllUsers(page = 1, limit = 40, role, isComplete, isActive, search, sortBy = "createdAt", sortOrder = "desc") {
        try {
            const skip = (page - 1) * limit;
            // Build a dynamic filter object
            const filter = {};
            if (role)
                filter.role = role;
            if (typeof isComplete === "boolean")
                filter.isComplete = isComplete;
            if (typeof isActive === "boolean")
                filter.isActive = isActive;
            const isTextSearch = !!search?.trim() && search.trim().length > 4;
            if (search?.trim()) {
                const term = search.trim();
                if (isTextSearch) {
                    filter.$text = {
                        $search: term,
                    };
                }
                else {
                    filter.$or = [
                        {
                            fullName: {
                                $regex: `^${escapeRegex(term)}`,
                                $options: "i",
                            },
                        },
                        {
                            email: {
                                $regex: `^${escapeRegex(term)}`,
                                $options: "i",
                            },
                        },
                        {
                            phoneNumber: {
                                $regex: `^${escapeRegex(term)}`,
                                $options: "i",
                            },
                        },
                        {
                            userReference: {
                                $regex: `^${escapeRegex(term)}`,
                                $options: "i",
                            },
                        },
                    ];
                }
            }
            // Defined sort order
            let sortCriteria = {};
            if (isTextSearch && sortBy === "relevance") {
                sortCriteria = {
                    score: {
                        $meta: "textScore",
                    },
                };
            }
            else {
                sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
                sortCriteria.createdAt = -1;
            }
            // Fetch data and count in parallel for better performance
            const [users, total] = await Promise.all([
                User.find(filter).sort(sortCriteria).skip(skip).limit(limit).lean(), // Use lean() for faster read-only queries
                User.countDocuments(filter),
            ]);
            return {
                users,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            throw new Error(error.message || "Failed to fetch users");
        }
    }
    static async GetUserById(userId) {
        try {
            const user = await User.findById(userId)
                .select("-password -otp -otpExpiresAt -resetPasswordToken -resetPasswordExpires")
                .lean();
            if (!user) {
                throw new Error("User not found with the provided ID");
            }
            return user;
        }
        catch (error) {
            if (error.name === "CastError") {
                throw new Error("Invalid User ID format");
            }
            throw error;
        }
    }
    static async GetUserByEmailOrPhone(identifier, role) {
        try {
            const user = await User.findOne({
                $or: [
                    { email: identifier, role },
                    { phoneNumber: identifier, role },
                ],
            })
                .select("-password -otp -resetPasswordToken -resetPasswordExpires")
                .lean();
            if (!user) {
                throw new Error(`No ${role} account found with these credentials.`);
            }
            return user;
        }
        catch (error) {
            throw new Error(error.message || "Failed to fetch user");
        }
    }
    static async deactivateUser(userId, status) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const user = await User.findByIdAndUpdate(userId, {
                $set: {
                    isActive: status,
                },
            }, {
                session,
                new: true,
                runValidators: true,
            });
            if (!user) {
                throw new Error("User not found");
            }
            if (!status) {
                await Session.deleteMany({ userId }, { session });
            }
            await session.commitTransaction();
            return user;
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    static async completeProfile(userId, fullName, dob, gender, referralCode, password, profileImage, userAgent, ip, email, phoneNumber, caste, gotra) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const user = await User.findById(userId).session(session);
            if (!user)
                throw new Error("User not found. Please register first.");
            if (user.isComplete)
                throw new Error("Profile is already complete.");
            let referredById = null;
            if (referralCode && !user.referredBy) {
                const referrer = await User.findOne({
                    referralCode: referralCode.trim().toUpperCase(),
                }).session(session);
                if (referrer) {
                    // Prevent self-referral
                    if (referrer._id.toString() === userId.toString()) {
                        throw new Error("You cannot use your own referral code.");
                    }
                    referredById = referrer._id;
                }
                else {
                    throw new Error("Invalid referral code.");
                }
            }
            let hashedPassword;
            if (password) {
                const salt = await bcrypt.genSalt(10);
                hashedPassword = await bcrypt.hash(password, salt);
            }
            const updatedUser = await User.findByIdAndUpdate(userId, {
                $set: {
                    fullName,
                    gender,
                    dob,
                    profileImage,
                    isComplete: true, // This locks the registration
                    ...(phoneNumber && { phoneNumber: phoneNumber }),
                    ...(email && { email: email }),
                    ...(hashedPassword && { password: hashedPassword }),
                    ...(referredById && { referredBy: referredById }),
                    ...(caste && { caste: caste }),
                    ...(gotra && { gotra: gotra }),
                },
            }, { new: true, runValidators: true, session }).lean();
            if (!updatedUser)
                throw new Error("Update failed.");
            // Session & Token Generation
            const familyId = crypto.randomUUID();
            const accessToken = jwt.sign({ userId: updatedUser._id, role: updatedUser.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
            const refreshToken = jwt.sign({ userId: updatedUser._id, familyId: familyId }, process.env.JWT_REFRESH_SECRET, { expiresIn: "30d" });
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            await Session.create([
                {
                    userId: updatedUser._id,
                    refreshToken,
                    deviceInfo: userAgent || "unknown",
                    familyId: familyId,
                    expiresAt,
                    ...(ip && { ipAddress: ip }),
                },
            ], { session });
            const { password: _, ...userWithoutPassword } = updatedUser;
            await session.commitTransaction();
            return {
                user: userWithoutPassword,
                accessToken,
                refreshToken,
            };
        }
        catch (error) {
            await session.abortTransaction();
            if (error.code === 11000 && error.keyValue) {
                const keys = Object.keys(error.keyValue);
                const duplicateField = keys.length > 0 ? keys[0] : null;
                if (duplicateField === "email") {
                    throw new Error("This email is already registered.");
                }
                if (duplicateField === "phoneNumber") {
                    throw new Error("This phone number is already in use.");
                }
                throw new Error(`${duplicateField} already exists.`);
            }
            if (error.name === "ValidationError") {
                const messages = Object.values(error.errors).map((val) => val.message);
                throw new Error(`Validation failed: ${messages.join(", ")}`);
            }
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    static async updateProfile(userId, updateData) {
        const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, {
            new: true,
            runValidators: true,
        })
            .select("-password -otp -otpExpiresAt -resetPasswordToken -resetPasswordExpires")
            .populate("coordinatorProfile.serviceableLocations.locationId");
        if (!updatedUser) {
            throw new Error("User not found");
        }
        return updatedUser;
    }
    static async uploadVerificationDocuments(userId, docs) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        const updatePayload = {};
        const isIdentityDocumentSubmitted = docs.aadharCard !== undefined ||
            docs.panCard !== undefined;
        const isBankDocumentSubmitted = docs.bankPassbook !== undefined;
        /*
         * IDENTITY DOCUMENTS
         *
         * Every new Aadhaar or PAN submission must be verified again.
         */
        if (isIdentityDocumentSubmitted) {
            updatePayload["documentVerification.status"] =
                VerificationStatus.PENDING;
            updatePayload["documentVerification.rejectionReason"] =
                null;
            updatePayload.isDocumentVerified = false;
            if (docs.aadharCard !== undefined) {
                updatePayload["documentVerification.aadharCard"] =
                    docs.aadharCard;
            }
            if (docs.panCard !== undefined) {
                updatePayload["documentVerification.panCard"] =
                    docs.panCard;
            }
            /*
             * Coordinator approval was based on the previous identity
             * documents, so identity re-submission requires coordinator
             * approval again.
             */
            if (user.role === Role.COORDINATOR &&
                user.coordinatorProfile) {
                updatePayload["coordinatorProfile.approvalStatus"] = ApprovalStatus.PENDING;
                updatePayload["coordinatorProfile.approvalRejectionReason"] = null;
                updatePayload["coordinatorProfile.autoAssignmentEnabled"] = false;
            }
        }
        /*
         * BANK DOCUMENTS
         *
         * New bank details must be verified again, but the coordinator's
         * working approval is not removed.
         */
        if (isBankDocumentSubmitted) {
            updatePayload["bankDocumentVerification.status"] =
                VerificationStatus.PENDING;
            updatePayload["bankDocumentVerification.rejectionReason"] = null;
            updatePayload.isBankDocumentVerified = false;
            updatePayload["bankDocumentVerification.bankPassbook"] = docs.bankPassbook;
            updatePayload["bankDocumentVerification.accountNumber"] = docs.accountNumber;
            updatePayload["bankDocumentVerification.accountName"] = docs.accountName;
            updatePayload["bankDocumentVerification.bankName"] = docs.bankName;
            updatePayload["bankDocumentVerification.ifscCode"] = docs.ifscCode;
        }
        if (Object.keys(updatePayload).length === 0) {
            throw new Error("No valid verification documents provided");
        }
        const updatedUser = await User.findByIdAndUpdate(userId, {
            $set: updatePayload,
        }, {
            new: true,
            runValidators: true,
        }).select("-password -otp -otpExpiresAt " +
            "-resetPasswordToken -resetPasswordExpires");
        if (!updatedUser) {
            throw new Error("User not found");
        }
        return updatedUser;
    }
    static async updateVerificationStatus(userId, type, status, rejectionReason) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        if (status === VerificationStatus.REJECTED &&
            !rejectionReason?.trim()) {
            throw new Error("Rejection reason is required when rejecting verification");
        }
        if (type === "document") {
            const hasIdentityDocument = Boolean(user.documentVerification?.aadharCard) ||
                Boolean(user.documentVerification?.panCard);
            if (status === VerificationStatus.APPROVED &&
                !hasIdentityDocument) {
                throw new Error("Identity verification cannot be approved because no Aadhaar or PAN document has been submitted");
            }
            user.documentVerification.status = status;
            user.documentVerification.rejectionReason =
                status === VerificationStatus.REJECTED
                    ? rejectionReason.trim()
                    : null;
            user.isDocumentVerified =
                status === VerificationStatus.APPROVED;
            /*
             * Verifying identity documents does not automatically approve
             * the coordinator. Coordinator approval remains a separate
             * admin action.
             */
            if (status === VerificationStatus.REJECTED &&
                user.role === Role.COORDINATOR &&
                user.coordinatorProfile) {
                user.coordinatorProfile.approvalStatus =
                    ApprovalStatus.PENDING;
                user.coordinatorProfile.autoAssignmentEnabled =
                    false;
            }
        }
        if (type === "bank") {
            const hasCompleteBankDetails = Boolean(user.bankDocumentVerification?.bankPassbook) &&
                Boolean(user.bankDocumentVerification?.accountNumber) &&
                Boolean(user.bankDocumentVerification?.accountName) &&
                Boolean(user.bankDocumentVerification?.bankName) &&
                Boolean(user.bankDocumentVerification?.ifscCode);
            if (status === VerificationStatus.APPROVED &&
                !hasCompleteBankDetails) {
                throw new Error("Bank verification cannot be approved because complete bank details have not been submitted");
            }
            user.bankDocumentVerification.status = status;
            user.bankDocumentVerification.rejectionReason =
                status === VerificationStatus.REJECTED
                    ? rejectionReason.trim()
                    : null;
            user.isBankDocumentVerified =
                status === VerificationStatus.APPROVED;
            /*
             * Do not change coordinator approval here.
             * Bank verification controls payouts, not the coordinator's
             * permission to work.
             */
        }
        await user.save();
        return User.findById(userId)
            .select("-password -otp -otpExpiresAt " +
            "-resetPasswordToken -resetPasswordExpires")
            .lean();
    }
    static async getCurrentUser(userId) {
        const user = await User.findById(userId)
            .select("-password -otp -otpExpiresAt -resetPasswordToken -resetPasswordExpires")
            .populate("coordinatorProfile.serviceableLocations.locationId")
            .lean();
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    }
    static async updateCoordinatorApproval(coordinatorId, status, rejectionReason) {
        const coordinator = await User.findOne({
            _id: coordinatorId,
            role: Role.COORDINATOR,
        });
        if (!coordinator) {
            throw new Error("Coordinator not found");
        }
        if (!coordinator.coordinatorProfile) {
            throw new Error("Coordinator profile has not been created");
        }
        if (status === ApprovalStatus.REJECTED &&
            !rejectionReason?.trim()) {
            throw new Error("Rejection reason is required when rejecting a coordinator");
        }
        /*
         * Identity verification is mandatory.
         * Bank verification is not required to approve the coordinator.
         */
        if (status === ApprovalStatus.APPROVED &&
            !coordinator.isDocumentVerified) {
            throw new Error("Coordinator identity documents must be verified before approval");
        }
        coordinator.coordinatorProfile.approvalStatus =
            status;
        coordinator.coordinatorProfile.approvalRejectionReason =
            status === ApprovalStatus.REJECTED
                ? rejectionReason.trim()
                : null;
        /*
         * Pending or rejected coordinators cannot receive automatic
         * assignments.
         */
        if (status !== ApprovalStatus.APPROVED) {
            coordinator.coordinatorProfile.autoAssignmentEnabled =
                false;
        }
        await coordinator.save();
        return User.findById(coordinatorId)
            .select("-password -otp -otpExpiresAt " +
            "-resetPasswordToken -resetPasswordExpires")
            .populate("coordinatorProfile.serviceableLocations.locationId")
            .lean();
    }
    static async updateCoordinatorAvailability(coordinatorId, availabilityStatus) {
        const coordinator = await User.findOne({
            _id: coordinatorId,
            role: Role.COORDINATOR,
        });
        if (!coordinator) {
            throw new Error("Coordinator not found");
        }
        if (!coordinator.coordinatorProfile) {
            throw new Error("Coordinator profile has not been created");
        }
        if (coordinator.coordinatorProfile.approvalStatus !== ApprovalStatus.APPROVED) {
            throw new Error("Coordinator must be approved before changing availability");
        }
        coordinator.coordinatorProfile.availabilityStatus = availabilityStatus;
        coordinator.coordinatorProfile.lastAvailabilityChangedAt = new Date();
        await coordinator.save();
        return {
            availabilityStatus: coordinator.coordinatorProfile.availabilityStatus,
            lastAvailabilityChangedAt: coordinator.coordinatorProfile.lastAvailabilityChangedAt,
        };
    }
    static async updateCoordinatorSettings(coordinatorId, settings) {
        const coordinator = await User.findOne({
            _id: coordinatorId,
            role: Role.COORDINATOR,
        });
        if (!coordinator) {
            throw new Error("Coordinator not found");
        }
        if (!coordinator.coordinatorProfile) {
            throw new Error("Coordinator profile has not been created");
        }
        if (settings.maxDailyBookings !== undefined) {
            coordinator.coordinatorProfile.maxDailyBookings =
                settings.maxDailyBookings;
        }
        if (settings.autoAssignmentEnabled !== undefined) {
            if (settings.autoAssignmentEnabled &&
                coordinator.coordinatorProfile.approvalStatus !==
                    ApprovalStatus.APPROVED) {
                throw new Error("Auto-assignment cannot be enabled until the coordinator is approved");
            }
            coordinator.coordinatorProfile.autoAssignmentEnabled =
                settings.autoAssignmentEnabled;
        }
        await coordinator.save();
        return {
            maxDailyBookings: coordinator.coordinatorProfile.maxDailyBookings,
            autoAssignmentEnabled: coordinator.coordinatorProfile.autoAssignmentEnabled,
        };
    }
    static async updateCoordinatorServiceableLocations(coordinatorId, serviceableLocations) {
        const coordinator = await User.findOne({
            _id: coordinatorId,
            role: Role.COORDINATOR,
        });
        if (!coordinator) {
            throw new Error("Coordinator not found");
        }
        if (!coordinator.coordinatorProfile) {
            throw new Error("Coordinator profile has not been created");
        }
        coordinator.coordinatorProfile.serviceableLocations =
            serviceableLocations.map((location) => ({
                locationId: new mongoose.Types.ObjectId(location.locationId),
                caste: location.caste ?? [],
                gotra: location.gotra ?? [],
            }));
        await coordinator.save();
        const updatedCoordinator = await User.findById(coordinatorId)
            .select("-password -otp -otpExpiresAt -resetPasswordToken -resetPasswordExpires")
            .populate("coordinatorProfile.serviceableLocations.locationId")
            .lean();
        return updatedCoordinator;
    }
    static async getCoordinatorById(coordinatorId) {
        const coordinator = await User.findOne({
            _id: coordinatorId,
            role: Role.COORDINATOR,
        })
            .select("-password -otp -otpExpiresAt -resetPasswordToken -resetPasswordExpires")
            .populate("coordinatorProfile.serviceableLocations.locationId")
            .lean();
        if (!coordinator) {
            throw new Error("Coordinator not found");
        }
        return coordinator;
    }
    static async getCoordinators(filters) {
        const { page = 1, limit = 20, approvalStatus, availabilityStatus, locationId, caste, gotra, autoAssignmentEnabled, minimumRating, search, sortBy = "createdAt", sortOrder = "desc", } = filters;
        const skip = (page - 1) * limit;
        const query = {
            role: Role.COORDINATOR,
        };
        if (approvalStatus) {
            query["coordinatorProfile.approvalStatus"] = approvalStatus;
        }
        if (availabilityStatus) {
            query["coordinatorProfile.availabilityStatus"] =
                availabilityStatus;
        }
        if (locationId) {
            query["coordinatorProfile.serviceableLocations.locationId"] =
                new mongoose.Types.ObjectId(locationId);
        }
        if (caste) {
            query["coordinatorProfile.serviceableLocations.caste"] = caste;
        }
        if (gotra) {
            query["coordinatorProfile.serviceableLocations.gotra"] = gotra;
        }
        if (typeof autoAssignmentEnabled === "boolean") {
            query["coordinatorProfile.autoAssignmentEnabled"] =
                autoAssignmentEnabled;
        }
        if (minimumRating !== undefined) {
            query["coordinatorProfile.averageRating"] = {
                $gte: minimumRating,
            };
        }
        if (search?.trim()) {
            const escapedSearch = escapeRegex(search.trim());
            query.$or = [
                {
                    fullName: {
                        $regex: escapedSearch,
                        $options: "i",
                    },
                },
                {
                    email: {
                        $regex: escapedSearch,
                        $options: "i",
                    },
                },
                {
                    phoneNumber: {
                        $regex: escapedSearch,
                        $options: "i",
                    },
                },
                {
                    userReference: {
                        $regex: escapedSearch,
                        $options: "i",
                    },
                },
            ];
        }
        const sortFieldMap = {
            createdAt: "createdAt",
            fullName: "fullName",
            averageRating: "coordinatorProfile.averageRating",
            totalCompletedBookings: "coordinatorProfile.totalCompletedBookings",
            acceptanceRate: "coordinatorProfile.acceptanceRate",
        };
        const selectedSortField = sortFieldMap[sortBy] ?? "createdAt";
        const sort = {
            [selectedSortField]: sortOrder === "asc" ? 1 : -1,
        };
        if (selectedSortField !== "createdAt") {
            sort.createdAt = -1;
        }
        const [coordinators, total] = await Promise.all([
            User.find(query)
                .select("-password -otp -otpExpiresAt -resetPasswordToken -resetPasswordExpires")
                .populate("coordinatorProfile.serviceableLocations.locationId")
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(query),
        ]);
        return {
            coordinators,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPreviousPage: page > 1,
            },
        };
    }
}
export default AuthService;
//# sourceMappingURL=auth.service.js.map