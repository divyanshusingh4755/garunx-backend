import type { Request, Response } from 'express';
import AuthService from '../services/auth.service.js';

export const register = async (req: Request, res: Response) => {
    try {
        const { role, password, idToken, userEmail, phoneNumber } = req.body

        // Call service to handle logic
        const user = await AuthService.registerUser(role, idToken, password, userEmail, phoneNumber)

        res.status(201).send({
            success: true,
            message: "User registered successfully",
            data: {
                userId: user._id,
                role: user.role,
                phoneNumber: user.phoneNumber
            }
        })

    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || 'Registration failed'
        })
    }
}

export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const { phoneNumber, otp } = req.body;
        await AuthService.verifyOtp(phoneNumber, otp)

        res.status(200).json({
            success: true,
            message: "Account verified successfully"
        })

    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || 'Invalid or expired otp'
        })
    }
}

export const resendOtp = async (req: Request, res: Response) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ message: 'Mobile number is required' })
        await AuthService.resendOtp(phoneNumber)

        res.status(200).json({
            success: true,
            message: 'A new OTP has been sent to your mobile number'
        })
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message })
    }
}

export const login = async (req: Request, res: Response) => {
    try {
        const { identifier, password, idToken } = req.body
        const userAgent = req.get('User-Agent') || 'unknown'

        const forwarded = req.headers['x-forwarded-for'];
        const ip = typeof forwarded === 'string'
            ? forwarded.split(',')[0]
            : (req.headers['x-real-ip'] as string) || req.socket.remoteAddress || '0.0.0.0';

        const { user, accessToken, refreshToken } = await AuthService.loginUser(identifier, userAgent, password, idToken, ip)

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        })

        // Send access Token
        res.status(200).json({ success: true, user, accessToken })
    } catch (error: any) {
        const statusCode = error.message.includes('not found') ? 404 : 401
        res.status(statusCode).json({ success: false, message: error.message })
    }
}

export const refreshToken = async (req: Request, res: Response) => {
    const oldToken = req.cookies.refreshToken;
    if (!oldToken) return res.status(401).json({ success: false, message: "No refresh token" })

    try {
        const userAgent = req.get('User-Agent') || 'unknown'

        const forwarded = req.headers['x-forwarded-for'];
        const ip = typeof forwarded === 'string'
            ? forwarded.split(',')[0]
            : (req.headers['x-real-ip'] as string) || req.socket.remoteAddress || '0.0.0.0';

        const { accessToken, refreshToken } = await AuthService.refreshAccesToken(oldToken, userAgent, ip)

        // Set the NEW rotated refresh token in the cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.json({ success: true, accessToken })
    } catch (error: any) {
        res.clearCookie('refreshToken')
        res.status(403).json({ success: false, message: error.message })
    }
}

export const logout = async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies.refreshToken
        const { allDevices } = req.body

        if (refreshToken) {
            await AuthService.loginUser(refreshToken, allDevices)
        }

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        })

        res.status(200).json({
            success: true,
            messages: allDevices ? "Logged out from all devices" : "Logged out successfully"
        })
    } catch (error: any) {
        console.log("err", error)
        res.status(500).json({ success: false, message: error.message })
    }
}

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Please provide an email address" })
        }

        const result = await AuthService.forgotPassword(email);
        res.status(200).json(result)
    } catch (error: any) {
        console.log("er", error)
        res.status(500).json({ success: false, message: "Error sending reset email. Please try again later." })
    }
}

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long."
            })
        }

        await AuthService.resetPassword(token as string, newPassword);

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: 'strict'
        })

        res.status(200).json({ success: true, message: "Password reset successfull" })
    } catch (error: any) {
        const statusCode = error.message.includes('expired') ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message })
    }
}

export const getGetAllUser = async (req: Request, res: Response) => {
    try {
        const { limit, page } = req.query;

        const { users, pagination } = await AuthService.GetAllUser(
            Number(page) || 1,
            Number(limit) || 40
        )

        res.status(200).json({ success: true, data: users, pagination })
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Error Getting User. Please try again later." })
    }
}

export const GetUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const data = await AuthService.GetUserById(id as string)

        res.status(200).json({ success: true, data })
    } catch (error: any) {
        const status = error.message.includes("not found") ? 404 : 500
        res.status(status).json({ success: false, message: "Error Getting User data by id. Please try again later." })
    }
}

export const GetUserByEmailorPhone = async (req: Request, res: Response) => {
    try {
        const { identifier } = req.params;

        const data = await AuthService.GetUserByEmailorPhone(identifier as string)

        res.status(200).json({ success: true, data })
    } catch (error: any) {
        const status = error.message.includes("found") ? 404 : 500;
        res.status(status).json({ success: false, message: "Error Getting User data by email or phone. Please try again later." })
    }
}

export const deactivateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await AuthService.deactivateUser(id as string)
        res.status(200).json({ success: true, message: "Account deativated successfully" })
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Error deactivating User data. Please try again later." })
    }
}