import type { Types } from "mongoose"
import { Profile } from "../models/profile.model.js"
import mongoose from "mongoose"
import { User } from "../models/user.model.js"
import { Session } from "../models/session.model.js"

class ProfileService {
    static async completeProfile(
        userId: Types.ObjectId | string,
        fullName: string,
        phoneNumber?: string,
        email?: string,
        dob?: Date,
        gender?: 'Male' | 'Female' | 'Other',
        referralCode?: string
    ) {

        // Fetch current profile to check if referredBy is already set
        const currentProfile = await Profile.findOne({ userId })
        if (!currentProfile) throw new Error("Profile not found")

        let referredById: Types.ObjectId | null = null

        // Validate Referral Code if provided
        if (referralCode && !currentProfile.referredBy) {
            const referrer = await Profile.findOne({
                referralCode: referralCode.trim().toUpperCase()
            }).lean()

            if (referrer) {
                // Prevent self referral logic
                if (referrer.userId.toString() === userId.toString()) {
                    throw new Error("You cannot use your own referral code")
                }
                referredById = referrer.userId
            }
        }

        // Atomic Update of the Profile
        const updateProfile = await Profile.findOneAndUpdate(
            { userId },
            {
                $set: {
                    fullName,
                    gender,
                    dob,
                    isComplete: true,
                    // Only update email/phone if they are provided
                    ...(email && { email }),
                    ...(phoneNumber && { phoneNumber }),
                    // set referrer only if a valid one was found
                    ...(referredById && { referredBy: referredById })
                }
            },
            {
                new: true,
                runValidators: true,
                upsert: false
            }
        )

        if (!updateProfile) {
            throw new Error('Profile not found. Please register first')
        }
        return updateProfile
    }

    static async getGetAllProfile(page: number = 1, limit: number = 40) {
        try {
            const skip = (page - 1) * limit
            const profiles = await Profile.find()
                .limit(limit)
                .skip(skip)
                .sort({ createdAt: -1 })

            const total = await Profile.countDocuments()

            return {
                profiles,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit)
                }
            }
        } catch (error: any) {
            throw error
        }
    }

    static async getProfileById(profileId: string) {
        try {
            const profile = await Profile.findById(profileId)

            if (!profile) {
                throw new Error("profile not found with these credentials")
            }
            return profile
        } catch (error: any) {
            throw error
        }
    }

    static async getProfileByEmailorPhone(identifier: string) {
        try {
            const profile = await Profile.findOne({
                $or: [{ email: identifier }, { phoneNumber: identifier }]
            })

            if (!profile) {
                throw new Error("profile not found with these credentials")
            }
            return profile
        } catch (error: any) {
            throw error
        }
    }

    static async deleteProfile(profileId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const profile = await Profile.findById(profileId);
            if (!profile) throw new Error("Profile not found");


            // First deactivate user
            await User.findByIdAndUpdate(
                profile.userId,
                { isActive: false },
                { session, new: true }
            );
            // Delete profile
            await Profile.deleteOne({ _id: profileId }, { session });
            //    Logout from everywhere
            await Session.deleteMany({ userId: profile.userId }, { session });
            await session.commitTransaction();
            return { success: true };
        } catch (error: any) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}

export default ProfileService