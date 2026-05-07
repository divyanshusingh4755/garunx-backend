import type { Request, Response } from "express";
import { TierService } from "../services/tier.service.js";

export const createTier = async (req: Request, res: Response) => {
  try {
    const data = await TierService.createTier(req.body);
    res.status(201).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error while creating tier",
    });
  }
};

export const updateTier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = await TierService.updateTier(id as string, req.body);
    res.status(200).json({
      sucess: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error while updating tier",
    });
  }
};

export const getTierById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = await TierService.getTierById(id as string);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error while getting tier by id",
    });
  }
};

export const toggleTierStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const data = await TierService.toggleTierStatus(id as string, isActive);
    res.status(200).json({
      succes: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error while toggle tier status",
    });
  }
};

export const getAllTier = async (req: Request, res: Response) => {
  try {
    const { searchTerm, limit, page, isActive, sortBy, sortOrder } = req.query;

    const {
      data,
      total,
      page: CurrentPage,
      totalPages,
    } = await TierService.FindTiers(
      Number(limit) || 40,
      Number(page) || 1,
      sortBy as string,
      (sortOrder as "asc" | "desc") || "asc",
      searchTerm as string,
      isActive === "true" ? true : isActive === "false" ? false : undefined,
    );

    res.status(200).json({
      sucess: true,
      data,
      total,
      CurrentPage,
      totalPages,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch tiers",
    });
  }
};
