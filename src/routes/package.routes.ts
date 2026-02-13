import { Router, type NextFunction, type Request, type Response } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { createPackage, getAllPackages, getPacakgeById, getPacakgesByLocation, togglePackageStatus, updatePackage } from "../controllers/package.controllers.js";

const router = Router();

const packageValidation = [
    body('name').notEmpty().withMessage("Package name is required").trim(),
    body('includedServices').isArray({ min: 1 }).withMessage("At least one services must be included"),
    body('locationIds').isArray({ min: 1 }).withMessage("Invalid Location ID"),
    body("packagePrice").isNumeric().withMessage("Price must be a number"),
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const firstError = errors.array()[0];
            return res.status(400).json({
                success: false,
                message: firstError?.msg,
                error: firstError
            });
        }
        next();
    }
]

router.get('/get-all-packages', getAllPackages);
router.post('/create-package', authenticate, packageValidation, createPackage)
router.patch('/update-package/:id', authenticate, packageValidation, updatePackage)
router.get('/location/:locationId', getPacakgesByLocation)
router.get('/get-package/:id', getPacakgeById)
router.patch('/delete-package/:id', togglePackageStatus)

export default router;