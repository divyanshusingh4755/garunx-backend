import { Router, } from "express";
import { body, param, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { createSubServiceComponent, toggleSubServiceComponent, getAllSubServiceComponents, getSubServiceComponentById, updateSubServiceComponent, } from "../controllers/subservices.controllers.js";
const router = Router();
const subServiceComponentValidation = [
    body("name").notEmpty().trim().withMessage("Name is required"),
    body("description").notEmpty().trim().withMessage("Description is required"),
    body("serviceId")
        .notEmpty()
        .withMessage("Service ID is required")
        .isMongoId()
        .withMessage("Invalid Service ID"),
    body("image").optional().isURL().withMessage("Image must be a valid URL"),
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
const idValidation = [
    param("id").isMongoId().withMessage("Invalid ID"),
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
router.get("/", getAllSubServiceComponents);
router.post("/", authenticate, subServiceComponentValidation, createSubServiceComponent);
router.patch("/:id", authenticate, idValidation, subServiceComponentValidation, updateSubServiceComponent);
router.get("/:id", authenticate, idValidation, getSubServiceComponentById);
router.patch("/:id/status", authenticate, idValidation, toggleSubServiceComponent);
export default router;
//# sourceMappingURL=subservices.routes.js.map