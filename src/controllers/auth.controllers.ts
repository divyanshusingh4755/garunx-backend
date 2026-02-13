import type { Request, Response } from 'express';
import AuthService from '../services/auth.service.js';
import { Role } from '../types/rbac.js';

export const register = async (req: Request, res: Response) => {
    try {
        const { role, password, idToken, userEmail, phoneNumber } = req.body;

        const user = await AuthService.registerUser(role, idToken, password, userEmail, phoneNumber);

        const nextStep = user.isOtpVerified ? "COMPLETE_PROFILE" : "VERIFY_OTP";

        res.status(201).json({
            success: true,
            message: user.isOtpVerified
                ? "Social login verified. Please complete your profile."
                : "Registration initiated. Please verify your OTP.",
            data: {
                userId: user._id,
                role: user.role,
                phoneNumber: user.phoneNumber,
                email: user.email,
                isOtpVerified: user.isOtpVerified,
                otp: user.otp,
                nextStep
            }
        });

    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || 'Registration failed'
        });
    }
};


export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const { userId, otp } = req.body;

        const user = await AuthService.verifyOtp(userId, otp);

        res.status(200).json({
            success: true,
            message: "OTP verified successfully. Please complete your profile.",
            data: {
                userId: user._id,
                role: user.role,
                isOtpVerified: user.isOtpVerified,
                isComplete: user.isComplete // Usually false at this stage
            }
        });

    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || 'OTP verification failed'
        });
    }
};

export const resendOtp = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required to resend OTP'
            });
        }

        await AuthService.resendOtp(userId);

        res.status(200).json({
            success: true,
            message: 'A new OTP has been sent successfully'
        });

    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to resend OTP'
        });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { identifier, password, idToken, role } = req.body;

        if (!role) {
            return res.status(400).json({ success: false, message: "Please specify the role for login." });
        }

        const userAgent = req.get('User-Agent') || 'unknown';
        const forwarded = req.headers['x-forwarded-for'];
        const ip = typeof forwarded === 'string'
            ? forwarded.split(',')[0]
            : (req.headers['x-real-ip'] as string) || req.socket.remoteAddress || '0.0.0.0';

        const { user, accessToken, refreshToken } = await AuthService.loginUser(
            identifier,
            role,
            password,
            idToken,
            userAgent,
            ip
        );

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.status(200).json({
            success: true,
            message: "Login successful",
            user,
            accessToken,
            refreshToken
        });

    } catch (error: any) {
        if (error.message.includes('incomplete')) {
            return res.status(403).json({
                success: false,
                message: error.message,
                nextStep: "COMPLETE_PROFILE"
            });
        }

        const statusCode = error.message.includes('not found') ? 404 : 401;
        res.status(statusCode).json({
            success: false,
            message: error.message || 'Login failed'
        });
    }
};

export const refreshToken = async (req: Request, res: Response) => {
    const oldToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!oldToken) {
        return res.status(401).json({ success: false, message: "Session expired. Please login again." });
    }

    try {
        const userAgent = req.get('User-Agent') || 'unknown';
        const forwarded = req.headers['x-forwarded-for'];
        const ip = typeof forwarded === 'string'
            ? forwarded.split(',')[0]
            : (req.headers['x-real-ip'] as string) || req.socket.remoteAddress || '0.0.0.0';

        const { accessToken, refreshToken: newRefreshToken } = await AuthService.refreshAccesToken(
            oldToken,
            userAgent,
            ip
        );

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.json({ success: true, accessToken, refreshToken: newRefreshToken });

    } catch (error: any) {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/'
        });

        res.status(403).json({
            success: false,
            message: error.message || "Invalid refresh attempt"
        });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
        const { allDevices } = req.body; // Boolean from frontend

        if (refreshToken) {
            await AuthService.logoutUser(refreshToken, allDevices);
        }

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/'
        });

        res.status(200).json({
            success: true,
            message: allDevices
                ? "Logged out from all devices for this role"
                : "Logged out successfully"
        });

    } catch (error: any) {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/'
        });
        res.status(200).json({ success: true, message: "Logged out" });
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email, role } = req.body;

        if (!email || !role) {
            return res.status(400).json({
                success: false,
                message: "Email and Role are required to reset password"
            });
        }

        const result = await AuthService.forgotPassword(email, role);

        res.status(200).json({
            success: true,
            message: result.message || "Reset code sent to your email",
            nextStep: "RESET_PASSWORD"
        });

    } catch (error: any) {
        const statusCode = error.message.includes('not found') ? 404 : 500;

        res.status(statusCode).json({
            success: false,
            message: error.message || "Error sending reset email. Please try again later."
        });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { otp, newPassword } = req.body;

        if (!otp) {
            return res.status(400).json({ success: false, message: "Verification code is required." });
        }

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long."
            });
        }

        await AuthService.resetPassword(otp, newPassword);

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/'
        });

        res.status(200).json({
            success: true,
            message: "Password reset successfully. Please login with your new credentials."
        });

    } catch (error: any) {
        const statusCode = (error.message.includes('expired') || error.message.includes('invalid')) ? 400 : 500;

        res.status(statusCode).json({
            success: false,
            message: error.message || "Failed to reset password."
        });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user?.userId

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!oldPassword) {
            return res.status(400).json({ success: false, message: "Existing Password missing" });
        }

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long."
            });
        }

        await AuthService.changePassword(userId as string, oldPassword, newPassword);

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/'
        });

        res.status(200).json({
            success: true,
            message: "Password reset successfully. Please login with your new credentials."
        });

    } catch (error: any) {
        const statusCode = (error.message.includes('expired') || error.message.includes('invalid')) ? 400 : 500;

        res.status(statusCode).json({
            success: false,
            message: error.message || "Failed to reset password."
        });
    }
};

export const getGetAllUser = async (req: Request, res: Response) => {
    try {
        const { limit, page, role, isComplete } = req.query;

        const { users, pagination } = await AuthService.GetAllUsers(
            Number(page) || 1,
            Number(limit) || 40,
            role as Role,
            isComplete === 'true' ? true : isComplete === 'false' ? false : undefined
        );

        res.status(200).json({
            success: true,
            data: users,
            pagination
        });

    } catch (error: any) {
        console.error("GetAllUsers Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Error fetching users. Please try again later."
        });
    }
};

export const GetUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: "User ID is required." });
        }

        const data = await AuthService.GetUserById(id as string);

        res.status(200).json({
            success: true,
            data
        });

    } catch (error: any) {
        const isNotFound = error.message.toLowerCase().includes("not found");
        const isInvalidId = error.name === 'CastError' || error.message.includes("format");

        const status = isNotFound ? 404 : (isInvalidId ? 400 : 500);

        res.status(status).json({
            success: false,
            message: error.message || "Error retrieving user data."
        });
    }
};

export const getUserByEmailOrPhone = async (req: Request, res: Response) => {
    try {
        const { identifier } = req.params;
        const { role } = req.query;

        if (!role) {
            return res.status(400).json({
                success: false,
                message: "Role is required to identify the correct profile."
            });
        }

        const data = await AuthService.GetUserByEmailOrPhone(identifier as string, role as Role);

        res.status(200).json({
            success: true,
            data
        });

    } catch (error: any) {
        const isNotFound = error.message.includes("found");
        const status = isNotFound ? 404 : 500;

        res.status(status).json({
            success: false,
            message: error.message || "Error retrieving user data. Please try again later."
        });
    }
};


export const deactivateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: "User ID is required." });
        }

        await AuthService.deactivateUser(id as string);

        res.status(200).json({
            success: true,
            message: "Account deactivated successfully and all active sessions revoked."
        });

    } catch (error: any) {
        const isNotFound = error.message.toLowerCase().includes("not found");
        const isInvalidId = error.name === 'CastError';

        const status = isNotFound ? 404 : (isInvalidId ? 400 : 500);

        res.status(status).json({
            success: false,
            message: error.message || "Error deactivating user. Please try again later."
        });
    }
};

export const completeProfile = async (req: Request, res: Response) => {
    try {
        const { userId, fullName, dob, gender, referralCode, password, profileImage, email, phoneNumber } = req.body;

        if (!userId || !fullName) {
            return res.status(400).json({
                success: false,
                message: "User ID and Full Name are required."
            });
        }

        const userAgent = req.get('User-Agent') || 'unknown';
        const forwarded = req.headers['x-forwarded-for'];
        const ip = typeof forwarded === 'string'
            ? forwarded.split(',')[0]
            : (req.headers['x-real-ip'] as string) || req.socket.remoteAddress || '0.0.0.0';

        const { user, accessToken, refreshToken } = await AuthService.completeProfile(
            userId,
            fullName,
            dob,
            gender,
            referralCode,
            password,
            profileImage,
            userAgent,
            ip,
            email,
            phoneNumber
        );

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.status(200).json({
            success: true,
            message: "Profile completed successfully. You are now fully registered.",
            data: {
                userId: user?._id,
                fullName: user?.fullName,
                role: user?.role,
                isComplete: user?.isComplete,
                referralCode: user?.referralCode
            },
            accessToken,
            refreshToken
        });

    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || 'Profile completion failed'
        });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId as string;
        const userRole = req.user?.role as string;

        const { fullName, dob, gender, profileImage, savedLocations, serviceableLocations } = req.body;

        const dataToUpdate: any = {
            fullName, dob, gender, profileImage, savedLocations
        };

        if (serviceableLocations && userRole === Role.COORDINATOR) {
            dataToUpdate.serviceableLocations = serviceableLocations;
        }

        const updatedUser = await AuthService.updateProfile(userId, dataToUpdate);

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found or update failed"
            })
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const uploadSingle = async (req: Request, res: Response) => {
    try {
        res.json({ success: true, url: (req.file as any).location })
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to upload single image'
        })
    }
}

export const uploadMutliple = async (req: Request, res: Response) => {
    try {
        const urls = (req.files as any[]).map(file => file.location)
        res.json({ success: true, urls })
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to upload multiple image'
        })
    }
}

export const verifyDocuments = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { aadharCard, panCard, bankPassbook } = req.body;

        if (!aadharCard && !panCard && !bankPassbook) {
            return res.status(400).json({ success: false, message: "Aadhar Card, Pan Card, Passbook is required" });
        }

        const docs = {
            aadharCard,
            panCard,
            bankPassbook
        }

        const updatedUser = await AuthService.uploadVerificationDocuments(userId as string, docs)

        res.status(200).json({
            success: true,
            message: "Documents submitted successfully. Verification is now PENDING.",
            data: updatedUser.documentVerification
        })

    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message })
    }
}

export const approveOrRejectDocs = async (req: Request, res: Response) => {
    try {
        const { userId, status, rejectionReason } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" })
        }

        if (status === "REJECTED" && !rejectionReason) {
            return res.status(400).json({ success: false, message: "Reason is required for rejection" })
        }

        const updatedUser = await AuthService.updateVerificationStatus(userId, status, rejectionReason)

        res.status(200).json({
            success: true,
            message: `User documents ${status.toLowerCase()} successfully`,
            data: {
                userId: updatedUser._id,
                status: updatedUser.documentVerification.status,
                isDocumentVerified: updatedUser.isDocumentVerified
            }
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message })
    }
}