import type { Request, Response } from "express";
import BrandingService from "../services/branding.service.js";

export const getTheme = async (req: Request, res: Response) => {
  try {
    const theme = await BrandingService.getAppTheme();

    return res.status(200).json({
      success: true,
      theme,
    });
  } catch (error: any) {
    const statusCode = error.message?.toLowerCase().includes("not found")
      ? 404
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to get app theme",
    });
  }
};

export const updateTheme = async (req: Request, res: Response) => {
  try {
    const branding = await BrandingService.updateAppTheme(req.body.theme);

    return res.status(200).json({
      success: true,
      message: "Theme updated successfully",
      data: {
        version: branding.version,
        theme: branding.theme,
      },
    });
  } catch (error: any) {
    const statusCode = error?.code === 11000 ? 409 : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update brand theme",
    });
  }
};
