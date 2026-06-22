import type { Request, Response } from "express";

import { ReferralRewardService } from "../services/referralreward.service.js";

export const getReferralInfo = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const data = await ReferralRewardService.getReferralInfo(userId as string);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getReferralStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const data = await ReferralRewardService.getReferralStats(userId as string);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getReferralHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { page, limit } = req.query;

    const {
      data,
      total,
      page: currentPage,
      totalPages,
    } = await ReferralRewardService.getReferralHistory(
      userId as string,
      Number(page) || 1,
      Number(limit) || 20,
    );

    return res.status(200).json({
      success: true,
      data,
      total,
      page: currentPage,
      totalPages,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getReferralRewards = async (req: Request, res: Response) => {
  try {
    const { page, limit, status, userId } = req.query;

    const {
      data,
      total,
      page: currentPage,
      totalPages,
    } = await ReferralRewardService.getReferralRewards(
      userId as string,
      Number(page) || 1,
      Number(limit) || 20,
      status as "PENDING" | "AWARDED" | "FAILED" | undefined,
    );

    return res.status(200).json({
      success: true,
      data,
      total,
      page: currentPage,
      totalPages,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
