import bcrypt from 'bcrypt';
import { User } from "../models/user.model.js";
import { Profile } from '../models/profile.model.js';
import { Otp } from '../models/otp.model.js';
import mongoose from 'mongoose';
import jwt from "jsonwebtoken";
import { Session } from '../models/session.model.js';
import crypto from 'crypto';
import nodemailer from "nodemailer";
import { auth } from '../config/firebase.js';
import { generateUniqueCode } from '../utils/generateUniqueCode.js';
class AuthService {
    static async registerUser(role, idToken, password) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Verify the Firebase Token
            const decodedToken = await auth.verifyIdToken(idToken);
            const { uid, phone_number, email } = decodedToken;
            // Hash Password
            let hashedPassword;
            if (password) {
                const salt = await bcrypt.genSalt(10);
                hashedPassword = await bcrypt.hash(password, salt);
            }
            // Create User
            const newUser = await User.findOneAndUpdate({ firebaseUid: uid }, {
                firebaseUid: uid,
                role,
                isVerified: true,
                ...(phone_number && { phoneNumber: phone_number }),
                ...(email && { email }),
                ...(hashedPassword && { password: hashedPassword })
            }, { session, upsert: true, new: true, runValidators: true });
            // Create Profile
            await Profile.findOneAndUpdate({ userId: newUser._id }, {
                $setOnInsert: {
                    ...(phone_number && { phoneNumber: phone_number }),
                    ...(email && { email }),
                    isComplete: false,
                    referralCode: `REF-${generateUniqueCode()}`
                }
            }, { session, upsert: true });
            // // Generate 6-digit OTP
            // const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
            // // Save OTP to DB
            // await Otp.create([{ phoneNumber, otp: generatedOtp }], { session });
            // // Call SMS provider
            await session.commitTransaction();
            return newUser;
        }
        catch (error) {
            await session.abortTransaction();
            if (error.code?.startsWith('auth/')) {
                throw new Error("Session expired, please try again");
            }
            if (error.code === 11000) {
                throw new Error("A verified user this number already exists.");
            }
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    static async verifyOtp(phoneNumber, otp) {
        // Find OTP in DB
        const otpRecord = await Otp.findOne({ phoneNumber, otp });
        if (!otpRecord) {
            throw new Error('Invalid or expired otp');
        }
        // Update User Status
        await User.findOneAndUpdate({ phoneNumber }, { isVerified: true }, { new: true });
        // Delete OTP record manually
        await Otp.deleteOne({ _id: otpRecord._id });
    }
    static async resendOtp(phoneNumber) {
        // Check if user exists and is not yet verified
        const user = await User.findOne({ phoneNumber });
        if (!user)
            throw new Error('User not found');
        if (user.isVerified)
            throw new Error('Account already verified. Please login.');
        // Rate limiting check
        const exisitingOtp = await Otp.findOne({ phoneNumber });
        if (exisitingOtp) {
            const timeDiff = (Date.now() - exisitingOtp.createdAt.getTime()) / 1000;
            if (timeDiff < 60) {
                throw new Error(`Please wait ${Math.round(60 - timeDiff)}s before resending a new OTP`);
            }
            // Delete the OLD OTP to replace it
            await Otp.deleteOne({ _id: exisitingOtp._id });
        }
        // Generate a new OTP
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        await Otp.create({ phoneNumber, otp: newOtp });
        // Trigger SMS Provider
        return true;
    }
    static async loginUser(identifier, userAgent, password, idToken, ip) {
        let user = null;
        // Social login via Firebase
        if (idToken) {
            try {
                const decodedToken = await auth.verifyIdToken(idToken);
                const { uid } = decodedToken;
                user = await User.findOne({ firebaseUid: uid });
                if (!user) {
                    throw new Error("User not found. Please register first.");
                }
                if (!user.isActive)
                    throw new Error("Account is deactivated.");
            }
            catch (error) {
                if (error.code?.startsWith('auth/'))
                    throw new Error('Invalid or expired session');
                throw error;
            }
        }
        else if (password) {
            user = await User.findOne({
                $or: [{ email: identifier }, { phoneNumber: identifier }]
            }).select('+password');
            if (!user || !user.password) {
                throw new Error('Invalid Credentials');
            }
            // Compare password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                throw new Error("Invalid credentials");
            }
        }
        else {
            throw new Error("Login method not supported");
        }
        // Post auth checks
        if (!user.isActive)
            throw new Error('Account is deactivated');
        const familyId = crypto.randomUUID();
        // Generate Token
        // Access Token
        const accessToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
        // Refresh Token
        const refreshToken = jwt.sign({ userId: user._id, familyId: familyId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await Session.create({
            userId: user._id,
            refreshToken,
            deviceInfo: userAgent || 'unknown',
            familyId: familyId,
            expiresAt,
            ...(ip && { ipAddress: ip })
        });
        // Remove password from object before returning
        const userObject = user.toObject();
        delete userObject.password;
        return { user: userObject, accessToken, refreshToken };
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
            // Decode the token
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            if (allDevices) {
                await Session.deleteMany({ userId: decoded.userId });
            }
            else {
                await Session.deleteOne({ refreshToken });
            }
            return { success: true };
        }
        catch (error) {
            return { sucess: true };
        }
    }
    static async forgotPassword(email) {
        try {
            const user = await User.findOne({ email });
            if (!user) {
                throw new Error("Account doesn't exists");
            }
            // Generate random token
            const resetToken = crypto.randomBytes(32).toString('hex');
            // Save to user document with 15 minute expiry
            const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            // Save to user document with 15 minute expiry
            user.resetPasswordToken = hashedToken;
            user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
            await user.save();
            // send email
            const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: 'Password Reset Request',
                html: `<h3>Reset Password</h3>
               <p>Click the link below to reset your password. It expires in 15 minutes.</p>
               <a href="${resetUrl}">${resetUrl}</a>`
            };
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
            await transporter.sendMail(mailOptions);
            return { success: true, message: 'Reset link sent to email' };
        }
        catch (error) {
            throw error;
        }
    }
    static async resetPassword(token, newPassword) {
        // hash the incoming token to match
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        // Find user with valid token
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            throw new Error("Token is invalid or has expired");
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        // security: Invalidate all existing sessions
        await Session.deleteMany({ userId: user._id });
        return { success: true, message: "Password updated sucessfully" };
    }
    static async GetAllUser(page = 1, limit = 40) {
        try {
            const skip = (page - 1) * limit;
            const users = await User.find()
                .limit(limit)
                .skip(skip)
                .sort({ createdAt: -1 });
            const total = await User.countDocuments();
            return {
                users,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit)
                }
            };
        }
        catch (error) {
            throw error;
        }
    }
    static async GetUserById(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error("User not found with these credentials");
            }
            return user;
        }
        catch (error) {
            throw error;
        }
    }
    static async GetUserByEmailorPhone(identifier) {
        try {
            const user = await User.findOne({
                $or: [{ email: identifier }, { phoneNumber: identifier }]
            });
            if (!user) {
                throw new Error("User not found with these credentials");
            }
            return user;
        }
        catch (error) {
            throw error;
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
}
export default AuthService;
//# sourceMappingURL=auth.service.js.map