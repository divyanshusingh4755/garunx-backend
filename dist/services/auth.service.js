import bcrypt from 'bcrypt';
import { User } from "../models/user.model.js";
import mongoose from 'mongoose';
import jwt from "jsonwebtoken";
import { Session } from '../models/session.model.js';
import crypto from 'crypto';
import nodemailer from "nodemailer";
import { auth } from '../config/firebase.js';
import { generateUniqueCode } from '../utils/generateUniqueCode.js';
class AuthService {
    static async generateUserSession(user, userAgent, ip) {
        const familyId = crypto.randomUUID();
        const accessToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId: user._id, familyId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await Session.findOneAndUpdate({ userId: user._id, deviceInfo: userAgent || 'unknown' }, { refreshToken, familyId, expiresAt, ...(ip && { ipAddress: ip }) }, { upsert: true });
        const userObject = user.toObject();
        delete userObject.password;
        return { user: userObject, accessToken, refreshToken };
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
            // Upsert User (Update unverified or create new)
            const user = await User.findOneAndUpdate({ $or: query }, {
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
                }
            }, { session, upsert: true, new: true, runValidators: true });
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
            let user = await User.findOne({ role, email });
            if (user) {
                user.isOtpVerified = true;
                await user.save();
            }
            else {
                user = await User.create({
                    role,
                    isComplete: false,
                    isOtpVerified: true,
                    referralCode: `REF-${generateUniqueCode()}`,
                    email: email,
                });
            }
            if (!user.isActive)
                throw new Error('Account is deactivated');
            const sessionData = await this.generateUserSession(user, userAgent, ip);
            return { ...sessionData, isNewUser: !user.isComplete };
        }
        catch (error) {
            console.log(error);
            if (error.code?.startsWith('auth/')) {
                throw new Error("Session expired, please try again");
            }
            if (error.code === 11000) {
                throw new Error("A verified user this phone number or email is already exists.");
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
            const hashedToken = crypto.createHash('sha256').update(otp).digest('hex');
            // Find user with valid token
            const user = await User.findOne({
                email: email,
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() }
            });
            if (!user) {
                throw new Error("OTP is invalid or has expired");
            }
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            user.isResetVerified = true;
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
                throw new Error('User not found. Please restart registration.');
            // Safety check: Don't resend if they already finished everything
            if (user.isComplete) {
                throw new Error('Account is already fully registered. Please login instead.');
            }
            // Update the existing document with new OTP
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otp = newOtp;
            user.otpExpiresAt = expiryTime;
            user.isOtpVerified = false;
            await user.save();
            // Trigger your SMS provider here (using user.phoneNumber)
            console.log(`Resending OTP ${newOtp} to ${user.phoneNumber}`);
            return { success: true, message: "OTP resent successfully via SMS", otp: newOtp };
        }
        if (email) {
            // Find the specific document by ID
            const user = await User.findOne({ email });
            if (!user)
                throw new Error('User not found. Please restart registration.');
            // Generate 6-digit OTP
            // const otp = crypto.randomInt(100000, 1000000).toString();
            // For testing
            const otp = "111111";
            // Save to user document (using your existing 15-min expiry logic)
            const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
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
            return { success: true, message: 'Reset code sent to your email', otp: otp };
        }
        throw new Error("Invalid resend type.");
    }
    static async loginUser(identifier, role, password, userAgent, ip) {
        if (!password) {
            throw new Error("Password is required for manual login");
        }
        const user = await User.findOne({
            role,
            $or: [
                { email: identifier.toLowerCase() },
                { phoneNumber: identifier }
            ]
        }).select('+password');
        if (!user || !user.password)
            throw new Error('Invalid Credentials');
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            throw new Error("Invalid credentials");
        // Status & Completeness Checks
        if (!user.isActive)
            throw new Error('Account is deactivated');
        if (!user.isOtpVerified)
            throw new Error('Please verify your account first.');
        if (!user.isComplete)
            throw new Error('Registration incomplete. Please finish setting up your profile.');
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
            const newAccessToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
            const newRefreshToken = jwt.sign({ userId: user._id, familyId: decoded.familyId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
            // Rotation: Replace old token with the new one in the same session document
            session.refreshToken = newRefreshToken;
            session.deviceInfo = userAgent;
            session.ipAddress = ip ?? session.ipAddress ?? "unknown";
            // keep the same family Id so we can track the lineage
            await session.save();
            return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
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
            const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
            user.resetPasswordToken = hashedOtp;
            user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
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
            return { success: true, message: 'Reset code sent to your email' };
        }
        catch (error) {
            throw new Error(error.message || "Failed to send reset email");
        }
    }
    static async resetPassword(userId, newPassword) {
        const user = await User.findOne({ _id: userId, isResetVerified: true });
        if (!user) {
            throw new Error("Invalid user");
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.isResetVerified = false;
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
    static async GetAllUsers(page = 1, limit = 40, role, isComplete) {
        try {
            const skip = (page - 1) * limit;
            // Build a dynamic filter object
            const filter = {};
            if (role)
                filter.role = role;
            if (typeof isComplete === 'boolean')
                filter.isComplete = isComplete;
            // Fetch data and count in parallel for better performance
            const [users, total] = await Promise.all([
                User.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(), // Use lean() for faster read-only queries
                User.countDocuments(filter)
            ]);
            return {
                users,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        }
        catch (error) {
            throw new Error(error.message || "Failed to fetch users");
        }
    }
    static async GetUserById(userId) {
        try {
            const user = await User.findById(userId)
                .select('-password -otp -otpExpiresAt -resetPasswordToken -resetPasswordExpires')
                .lean();
            if (!user) {
                throw new Error("User not found with the provided ID");
            }
            return user;
        }
        catch (error) {
            if (error.name === 'CastError') {
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
                    { phoneNumber: identifier, role }
                ]
            })
                .select('-password -otp -resetPasswordToken -resetPasswordExpires')
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
    static async deactivateUser(userId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const user = await User.findByIdAndUpdate(userId, { isActive: false }, { session, new: true });
            if (!user)
                throw new Error("User not found");
            // Kill all active session
            await Session.deleteMany({ userId }, { session });
            await session.commitTransaction();
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    static async completeProfile(userId, fullName, dob, gender, referralCode, password, profileImage, userAgent, ip, email, phoneNumber) {
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
                    referralCode: referralCode.trim().toUpperCase()
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
                    ...(referredById && { referredBy: referredById })
                }
            }, { new: true, runValidators: true, session }).lean();
            if (!updatedUser)
                throw new Error("Update failed.");
            // Session & Token Generation
            const familyId = crypto.randomUUID();
            const accessToken = jwt.sign({ userId: updatedUser._id, role: updatedUser.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
            const refreshToken = jwt.sign({ userId: updatedUser._id, familyId: familyId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            await Session.create([
                {
                    userId: updatedUser._id,
                    refreshToken,
                    deviceInfo: userAgent || 'unknown',
                    familyId: familyId,
                    expiresAt,
                    ...(ip && { ipAddress: ip })
                }
            ], { session });
            const { password: _, ...userWithoutPassword } = updatedUser;
            await session.commitTransaction();
            return { user: userWithoutPassword, accessToken, refreshToken };
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    static async updateProfile(userId, updateData) {
        const user = await User.findById(userId);
        if (!user)
            throw new Error("User not found");
        if (updateData.serviceableLocations && !user.isDocumentVerified) {
            throw new Error("Action Denied: Please wait for Admin to verify your documents before setting work areas.");
        }
        const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true })
            .select('-password -otp')
            .populate('serviceableLocations');
        return updatedUser;
    }
    static async uploadVerificationDocuments(userId, docs) {
        const updateData = {
            "documentVerification.status": "PENDING"
        };
        if (docs.aadharCard)
            updateData["documentVerification.aadharCard"] = docs.aadharCard;
        if (docs.panCard)
            updateData["documentVerification.panCard"] = docs.panCard;
        if (docs.bankPassbook)
            updateData["documentVerification.bankPassbook"] = docs.bankPassbook;
        const user = await User.findByIdAndUpdate(userId, {
            $set: updateData
        }, { new: true, runValidators: true }).select('-password -otp');
        if (!user)
            throw new Error('User not found');
        return user;
    }
    static async updateVerificationStatus(userId, status, rejectionReason) {
        const update = {
            "documentVerification.status": status,
            "documentVerification.rejectionReason": status === 'REJECTED' ? rejectionReason : null,
            // Mark as fully verified only if approved
            isDocumentVerified: status === 'APPROVED'
        };
        const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true }).select('-password -otp');
        if (!user)
            throw new Error("User not found");
        return user;
    }
}
export default AuthService;
//# sourceMappingURL=auth.service.js.map