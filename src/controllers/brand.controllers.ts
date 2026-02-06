import type { Request, Response } from "express"
import BrandingService from "../services/branding.service.js"

export const getTheme = async (req: Request, res: Response) => {
    try {
        const theme = await BrandingService.getAppTheme()
        res.status(200).json({ success: true, theme })
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to get app theme'
        })
    }
}

export const updateTheme = async (req: Request, res: Response) => {
    try {
        await BrandingService.updateAppTheme(req.body.theme);
        res.status(201).json({ success: true, message: "Theme updated successfully" })
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update brand theme'
        })
    }
}