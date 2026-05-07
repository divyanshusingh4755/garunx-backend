import { Router, } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { createState, deleteState, getAllState, getStateById, updateState, } from "../controllers/state.controllers.js";
const router = Router();
const stateValidation = [
    body("country").notEmpty().trim(),
    body("name").notEmpty().trim(),
    body("image").optional().isURL().withMessage("Image must be a valid URL"),
    body("description").optional().isString().trim(),
    body("location.coordinates")
        .optional()
        .isArray({ min: 2, max: 2 })
        .withMessage("Coordinates must be [longitude, latitude]"),
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
// --- 2. State Routes ---
router.get("/get-all-state", getAllState); // Specific first
router.post("/create-state", authenticate, stateValidation, createState);
router.patch("/update-state/:id", authenticate, stateValidation, updateState);
router.get("/:id", authenticate, getStateById); // Dynamic last
router.patch("/:id/status", authenticate, deleteState);
export default router;
//# sourceMappingURL=state.routes.js.map