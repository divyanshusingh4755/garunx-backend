import { Router } from "express";
import { body } from "express-validator";
import { getTheme, updateTheme, } from "../controllers/brand.controllers.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
import { validate } from "../utils/validate.js";
import { requirePermission } from "../middleware/rbac.js";
const router = Router();
const updateThemeValidation = [
    body("theme")
        .exists({ checkNull: true })
        .withMessage("Theme is required")
        .isObject()
        .withMessage("Theme must be an object")
        .custom((theme) => {
        const allowedFields = [
            "primary",
            "secondary",
            "accent",
            "background",
            "text",
        ];
        const keys = Object.keys(theme);
        if (keys.length === 0) {
            throw new Error("At least one theme field is required");
        }
        const invalidFields = keys.filter((key) => !allowedFields.includes(key));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid theme fields: ${invalidFields.join(", ")}`);
        }
        return true;
    }),
    body("theme.primary")
        .optional()
        .isString()
        .withMessage("Primary color must be a string")
        .trim()
        .notEmpty()
        .withMessage("Primary color cannot be empty"),
    body("theme.secondary")
        .optional()
        .isString()
        .withMessage("Secondary color must be a string")
        .trim()
        .notEmpty()
        .withMessage("Secondary color cannot be empty"),
    body("theme.accent")
        .optional()
        .isString()
        .withMessage("Accent color must be a string")
        .trim()
        .notEmpty()
        .withMessage("Accent color cannot be empty"),
    body("theme.background")
        .optional()
        .isString()
        .withMessage("Background color must be a string")
        .trim()
        .notEmpty()
        .withMessage("Background color cannot be empty"),
    body("theme.text")
        .optional()
        .isString()
        .withMessage("Text color must be a string")
        .trim()
        .notEmpty()
        .withMessage("Text color cannot be empty"),
    validate,
];
router.get("/get-theme", getTheme);
router.patch("/update-theme", authenticate, authorizeRoles(Role.ADMIN), requirePermission("branding.update"), updateThemeValidation, updateTheme);
export default router;
//# sourceMappingURL=branding.routes.js.map