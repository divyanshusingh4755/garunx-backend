import bcrypt from 'bcrypt';
import { Profile } from "../models/profile.model.js";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Session } from "../models/session.model.js";
class ProfileService {
    static async completeProfile(userId, fullName, phoneNumber, email, dob, gender, referralCode, password, profileImage) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Fetch current profile to check if referredBy is already set
            const currentProfile = await Profile.findOne({ userId }).session(session);
            if (!currentProfile)
                throw new Error("Profile not found");
            let referredById = null;
            // Validate Referral Code if provided
            if (referralCode && !currentProfile.referredBy) {
                const referrer = await Profile.findOne({
                    referralCode: referralCode.trim().toUpperCase()
                }).session(session);
                if (referrer) {
                    // Prevent self referral logic
                    if (referrer.userId.toString() === userId.toString()) {
                        throw new Error("You cannot use your own referral code");
                    }
                    referredById = referrer.userId;
                }
            }
            let hashedPassword;
            if (password) {
                const salt = await bcrypt.genSalt(10);
                hashedPassword = await bcrypt.hash(password, salt);
                await User.findByIdAndUpdate(userId, {
                    $set: {
                        hashedPassword
                    }
                }).session(session);
            }
            // Atomic Update of the Profile
            const updateProfile = await Profile.findOneAndUpdate({ userId }, {
                $set: {
                    fullName,
                    gender,
                    dob,
                    isComplete: true,
                    profileImage,
                    // Only update email/phone if they are provided
                    ...(email && { email }),
                    ...(phoneNumber && { phoneNumber }),
                    // set referrer only if a valid one was found
                    ...(referredById && { referredBy: referredById })
                }
            }, {
                new: true,
                runValidators: true,
                upsert: false,
                session
            });
            if (!updateProfile) {
                throw new Error('Profile not found. Please register first');
            }
            await session.commitTransaction();
            return updateProfile;
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    static async getGetAllProfile(page = 1, limit = 40) {
        try {
            const skip = (page - 1) * limit;
            const profiles = await Profile.find()
                .limit(limit)
                .skip(skip)
                .sort({ createdAt: -1 });
            const total = await Profile.countDocuments();
            return {
                profiles,
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
    static async getProfileById(profileId) {
        try {
            const profile = await Profile.findById(profileId);
            if (!profile) {
                throw new Error("profile not found with these credentials");
            }
            return profile;
        }
        catch (error) {
            throw error;
        }
    }
    static async getProfileByEmailorPhone(identifier) {
        try {
            const profile = await Profile.findOne({
                $or: [{ email: identifier }, { phoneNumber: identifier }]
            });
            if (!profile) {
                throw new Error("profile not found with these credentials");
            }
            return profile;
        }
        catch (error) {
            throw error;
        }
    }
    static async deleteProfile(profileId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const profile = await Profile.findById(profileId);
            if (!profile)
                throw new Error("Profile not found");
            // First deactivate user
            await User.findByIdAndUpdate(profile.userId, { isActive: false }, { session, new: true });
            // Delete profile
            await Profile.deleteOne({ _id: profileId }, { session });
            //    Logout from everywhere
            await Session.deleteMany({ userId: profile.userId }, { session });
            await session.commitTransaction();
            return { success: true };
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
export default ProfileService;
//# sourceMappingURL=profile.service.js.map