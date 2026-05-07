import { Router, } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { createComponentItem, getAllComponentItems, getComponentItemById, updateComponentItem, updateComponentItemStatus, } from "../controllers/componentItem.controllers.js";
import { body, validationResult } from "express-validator";
const router = Router();
export const componentItemValidation = [
    body("name").notEmpty().withMessage("name is required").isString().trim(),
    body("price").optional().isNumeric().withMessage("price must be a number"),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be boolean"),
    (req, res, next) => {
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
export const updateComponentItemValidation = [
    body("name")
        .optional()
        .isString()
        .trim()
        .withMessage("name must be a string"),
    body("price").optional().isNumeric().withMessage("price must be a number"),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be boolean"),
    (req, res, next) => {
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
router.get("/", getAllComponentItems);
router.post("/", authenticate, componentItemValidation, createComponentItem);
router.put("/:componentItemId", authenticate, updateComponentItemValidation, updateComponentItem);
router.get("/:componentItemId", getComponentItemById);
router.patch("/:componentItemId/status", authenticate, updateComponentItemStatus);
export default router;
//# sourceMappingURL=componentitem.routes.js.map