import type { Request, Response } from "express";
import { BannerService } from "../services/banner.service.js";
import type { IBanner } from "../models/banner.model.js";

export const createBanner = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      buttonText,
      placement,
      format,
      image,
      displayOrder,
      isActive,
      redirect,
    } = req.body;

    const banner = await BannerService.createBanner({
      name,
      description,
      buttonText,
      placement,
      format,
      image,
      displayOrder: Number(displayOrder ?? 0),
      isActive: isActive ?? true,
      redirect,
    });

    res.status(201).json({
      success: true,
      message: "Banner created successfully",
      data: banner,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const updateData: Partial<IBanner> = {
      ...req.body,
    };

    if (updateData.displayOrder !== undefined) {
      updateData.displayOrder = Number(updateData.displayOrder);
    }

    const banner = await BannerService.updateBanner(id as string, updateData);

    res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: banner,
    });
  } catch (error: any) {
    res.status(error.message === "Banner not found" ? 404 : 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getBannerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const banner = await BannerService.getBannerById(id as string);

    res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error: any) {
    res.status(error.message === "Banner not found" ? 404 : 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await BannerService.deleteBanner(id as string);

    res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error: any) {
    res.status(error.message === "Banner not found" ? 404 : 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const toggleBannerStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const banner = await BannerService.toggleBannerStatus(id as string);

    res.status(200).json({
      success: true,
      message: `Banner ${banner.isActive ? "activated" : "deactivated"
        } successfully`,
      data: banner,
    });
  } catch (error: any) {
    res.status(error.message === "Banner not found" ? 404 : 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllBanners = async (req: Request, res: Response) => {
  try {
    const {
      searchTerm,
      placement,
      format,
      redirectType,
      isActive,
      limit,
      page,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await BannerService.findBanners(
      searchTerm as string,
      placement as string,
      format as string,
      redirectType as
      | "NONE"
      | "SERVICE"
      | "PACKAGE"
      | "CATEGORY"
      | "PRODUCT"
      | "URL"
      | undefined,
      Number(limit) || 20,
      Number(page) || 1,
      isActive === "true"
        ? true
        : isActive === "false"
          ? false
          : undefined,
      (sortBy as string) || "displayOrder",
      (sortOrder as "asc" | "desc") || "asc"
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
