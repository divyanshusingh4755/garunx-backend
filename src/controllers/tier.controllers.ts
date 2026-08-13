import type { Request, Response } from "express";
import { TierService } from "../services/tier.service.js";

const getErrorStatus = (message: string) => {
  if (message === "Tier not found") {
    return 404;
  }

  if (message.includes("already exists") || message.includes("duplicate")) {
    return 409;
  }

  return 400;
};

const parsePositiveInteger = (
  value: unknown,
  fallback: number,
  maximum?: number,
) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return maximum ? Math.min(parsed, maximum) : parsed;
};

export const createTier = async (req: Request, res: Response) => {
  try {
    const data = await TierService.createTier(req.body);

    return res.status(201).json({
      success: true,
      message: "Tier created successfully",
      data,
    });
  } catch (error: any) {
    return res.status(getErrorStatus(error.message)).json({
      success: false,
      message: error.message || "Error while creating tier",
    });
  }
};

export const updateTier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const data = await TierService.updateTier(id as string, req.body);

    return res.status(200).json({
      success: true,
      message: "Tier updated successfully",
      data,
    });
  } catch (error: any) {
    return res.status(getErrorStatus(error.message)).json({
      success: false,
      message: error.message || "Error while updating tier",
    });
  }
};

export const getTierById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const data = await TierService.getTierById(id as string);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(getErrorStatus(error.message)).json({
      success: false,
      message: error.message || "Error while getting tier by id",
    });
  }
};

export const toggleTierStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive, confirmed = false } = req.body;

    const data = await TierService.toggleTierStatus(
      id as string,
      isActive,
      confirmed,
    );

    return res.status(200).json({
      success: true,
      requiresConfirmation: data.requiresConfirmation === true,
      message: data.message,
      data,
    });
  } catch (error: any) {
    return res.status(getErrorStatus(error.message)).json({
      success: false,
      message: error.message || "Error while toggling tier status",
    });
  }
};

export const getAllTier = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      searchTerm,
      limit,
      page,
      sortBy,
      sortOrder,
    } = req.query;

    const parsedLimit =
      parsePositiveInteger(limit, 40, 100);

    const parsedPage =
      parsePositiveInteger(page, 1);

    const {
      data,
      total,
      page: currentPage,
      totalPages,
    } = await TierService.findTiers(
      parsedLimit,
      parsedPage,
      (sortBy as string) || "createdAt",
      (sortOrder as "asc" | "desc") || "asc",
      searchTerm as string,
      true,
    );

    return res.status(200).json({
      success: true,
      data,
      total,
      currentPage,
      totalPages,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch tiers",
    });
  }
};

export const getAllTierAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      searchTerm,
      limit,
      page,
      isActive,
      sortBy,
      sortOrder,
    } = req.query;

    const parsedLimit =
      parsePositiveInteger(limit, 40, 100);

    const parsedPage =
      parsePositiveInteger(page, 1);

    const activeStatus =
      isActive === "true"
        ? true
        : isActive === "false"
          ? false
          : undefined;

    const {
      data,
      total,
      page: currentPage,
      totalPages,
    } = await TierService.findTiers(
      parsedLimit,
      parsedPage,
      (sortBy as string) || "createdAt",
      (sortOrder as "asc" | "desc") || "asc",
      searchTerm as string,
      activeStatus,
    );

    return res.status(200).json({
      success: true,
      data,
      total,
      currentPage,
      totalPages,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch tiers",
    });
  }
};