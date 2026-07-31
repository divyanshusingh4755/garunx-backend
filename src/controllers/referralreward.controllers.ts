import type {
  Request,
  Response,
} from "express";

import {
  ReferralRewardService,
} from "../services/referralreward.service.js";

type RewardStatus =
  | "PENDING"
  | "AWARDED"
  | "FAILED";

const getErrorMessage = (
  error: unknown,
  fallback: string,
): string =>
  error instanceof Error
    ? error.message
    : fallback;

const getErrorStatus = (
  error: unknown,
): number => {
  if (
    error instanceof Error &&
    error.message === "User not found"
  ) {
    return 404;
  }

  return 400;
};

const getAuthenticatedUserId = (
  req: Request,
): string | null => {
  const userId = req.user?.userId;

  return userId
    ? String(userId)
    : null;
};

export const getReferralInfo = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const data =
      await ReferralRewardService
        .getReferralInfo(userId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message: getErrorMessage(
          error,
          "Failed to fetch referral information",
        ),
      });
  }
};

export const getReferralStats = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const data =
      await ReferralRewardService
        .getReferralStats(userId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message: getErrorMessage(
          error,
          "Failed to fetch referral statistics",
        ),
      });
  }
};

export const getReferralHistory = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const page =
      typeof req.query.page === "number"
        ? req.query.page
        : Number(req.query.page);

    const limit =
      typeof req.query.limit === "number"
        ? req.query.limit
        : Number(req.query.limit);

    const result =
      await ReferralRewardService
        .getReferralHistory(
          userId,
          Number.isInteger(page) && page > 0
            ? page
            : 1,
          Number.isInteger(limit) && limit > 0
            ? Math.min(limit, 100)
            : 20,
        );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(
        error,
        "Failed to fetch referral history",
      ),
    });
  }
};

export const getReferralRewards = async (
  req: Request,
  res: Response,
) => {
  try {
    const authenticatedUserId =
      getAuthenticatedUserId(req);

    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const page =
      typeof req.query.page === "number"
        ? req.query.page
        : Number(req.query.page);

    const limit =
      typeof req.query.limit === "number"
        ? req.query.limit
        : Number(req.query.limit);

    const status =
      typeof req.query.status === "string"
        ? req.query.status as RewardStatus
        : undefined;

    const userId =
      typeof req.query.userId === "string"
        ? req.query.userId
        : undefined;

    const result =
      await ReferralRewardService
        .getReferralRewards(
          userId,
          Number.isInteger(page) && page > 0
            ? page
            : 1,
          Number.isInteger(limit) && limit > 0
            ? Math.min(limit, 100)
            : 20,
          status,
        );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(
        error,
        "Failed to fetch referral rewards",
      ),
    });
  }
};
