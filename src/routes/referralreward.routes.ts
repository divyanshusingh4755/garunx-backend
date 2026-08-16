import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import { body, query, validationResult } from "express-validator";

import {
  getReferralInfo,
  getReferralHistory,
  getReferralRewards,
  getReferralStats,
  exportReferralRewardsCsv,
} from "../controllers/referralreward.controllers.js";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
import { requirePermission } from "../middleware/rbac.js";

const router = Router();

const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];

    return res.status(400).json({
      success: false,
      message: firstError?.msg,
      error: firstError,
    });
  }

  return next();
};

const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be greater than 0")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100")
    .toInt(),

  validate,
];

const rewardsValidation = [
  query("status")
    .optional()
    .isIn(["PENDING", "AWARDED", "FAILED"])
    .withMessage("Invalid reward status"),

  query("userId").optional().isMongoId().withMessage("Invalid userId"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be greater than 0")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100")
    .toInt(),

  validate,
];

const exportRewardsValidation = [
  body("rewardIds")
    .isArray({
      min: 1,
      max: 1000,
    })
    .withMessage(
      "rewardIds must contain between 1 and 1000 reward IDs",
    ),

  body("rewardIds.*")
    .isMongoId()
    .withMessage(
      "Each rewardId must be a valid MongoDB ID",
    ),

  validate,
];

// =========================================================
// USER - REFERRAL INFO
// =========================================================

router.get(
  "/",
  authenticate,
  authorizeRoles(Role.USER),
  getReferralInfo,
);

router.get(
  "/stats",
  authenticate,
  authorizeRoles(Role.USER),
  getReferralStats,
);

router.get(
  "/history",
  authenticate,
  authorizeRoles(Role.USER),
  paginationValidation,
  getReferralHistory,
);


// =========================================================
// ADMIN - REFERRAL REWARDS
// =========================================================

router.get(
  "/rewards",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("referral_reward.read"),
  rewardsValidation,
  getReferralRewards,
);

router.post(
  "/export",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("referral_reward.export"),
  exportRewardsValidation,
  exportReferralRewardsCsv,
);


export default router;