import {
  type Request,
  type Response,
  type NextFunction,
  Router,
} from "express";
import { body, validationResult } from "express-validator";

import { authenticate } from "../middleware/authenticate.js";

import {
  getAllFaqs,
  getFaqById,
  createFaq,
  updateFaq,
  toggleFaqStatus,
  deleteFaq,
} from "../controllers/faq.controllers.js";

const faqValidation = [
  body("name").notEmpty().withMessage("Name is required").isString().trim(),

  body("question")
    .notEmpty()
    .withMessage("Question is required")
    .isString()
    .trim(),

  body("answer").notEmpty().withMessage("Answer is required").isString().trim(),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  body("displayOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Display order must be a non-negative integer"),

  (req: Request, res: Response, next: NextFunction) => {
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
  },
];

const router = Router();

router.get("/", getAllFaqs);
router.get("/:id", authenticate, getFaqById);
router.post("/", authenticate, faqValidation, createFaq);
router.put("/:id", authenticate, faqValidation, updateFaq);
router.patch("/:id/status", authenticate, toggleFaqStatus);
router.delete("/:id", authenticate, deleteFaq);

export default router;
