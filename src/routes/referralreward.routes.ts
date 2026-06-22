import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import { query, validationResult } from "express-validator";

import {
  getReferralInfo,
  getReferralHistory,
  getReferralRewards,
  getReferralStats,
} from "../controllers/referralreward.controllers.js";

import { authenticate } from "../middleware/authenticate.js";

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

  next();
};

const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be greater than 0"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),

  validate,
];

const rewardsValidation = [
  query("status")
    .optional()
    .isIn(["PENDING", "AWARDED", "FAILED"])
    .withMessage("Invalid reward status"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be greater than 0"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),

  validate,
];

router.get("/rewards", rewardsValidation, getReferralRewards);
router.get("/", authenticate, getReferralInfo);
router.get("/stats", authenticate, getReferralStats);
router.get("/history", authenticate, paginationValidation, getReferralHistory);

export default router;
