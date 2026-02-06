import type { Request, Response } from "express"
import ProfileService from "../services/profile.service.js"

export const completeProfile = async (req: Request, res: Response) => {
    try {
        const { userId, fullName, phoneNumber, email, dob, gender, referralCode } = req.body

        // Call service to handle logic
        const profile = await ProfileService.completeProfile(userId, fullName, phoneNumber, email, dob, gender, referralCode)

        res.status(200).send({
            success: true,
            message: "Profile updated successfully",
            data: profile
        })
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || 'Profile Updation failed'
        })
    }
}

export const getGetAllProfile = async (req: Request, res: Response) => {
    try {
        const { limit, page } = req.query;

        const { profiles, pagination } = await ProfileService.getGetAllProfile(
            Number(page) || 1,
            Number(limit) || 40
        )

        res.status(200).json({ success: true, data: profiles, pagination })
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Error Getting User Profile. Please try again later." })
    }
}

export const getProfileById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const data = await ProfileService.getProfileById(id as string)

        res.status(200).json({ success: true, data })
    } catch (error: any) {
        const status = error.message.includes("not found") ? 404 : 500
        res.status(status).json({ success: false, message: "Error Getting User Profile data by id. Please try again later." })
    }
}

export const getProfileByEmailorPhone = async (req: Request, res: Response) => {
    try {
        const { identifier } = req.params;

        const data = await ProfileService.getProfileByEmailorPhone(identifier as string)

        res.status(200).json({ success: true, data })
    } catch (error: any) {
        const status = error.message.includes("found") ? 404 : 500;
        res.status(status).json({ success: false, message: "Error Getting User Profile data by email or phone. Please try again later." })
    }
}

export const deleteProfile = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await ProfileService.deleteProfile(id as string)
        res.status(200).json({ success: true, message: "Profile deleted successfully" })
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Error deleting User profile. Please try again later." })
    }
}

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