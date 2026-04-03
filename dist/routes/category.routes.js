import { Router } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { getAllCategories, getCategoryById, createCategory, updateCategory, toggleCategoryStatus, deleteCategory } from "../controllers/category.controllers.js";
const categoryValidation = [
    body('label')
        .notEmpty().withMessage('label is required')
        .isString().trim(),
    body('value')
        .notEmpty().withMessage('Value is required')
        .isString()
        .toLowerCase()
        .trim()
        .matches(/^[a-z0-9-]+$/).withMessage('value must be slug-friendly (lowercase, numbers and hyphens only)'),
    body('type')
        .notEmpty().withMessage('Type is required')
        .isIn(['service', 'product']).withMessage("Type must be either 'service or 'product'"),
    body('image')
        .optional()
        .isURL().withMessage('Image must be a valid URL'),
    body('description')
        .optional()
        .isString().trim(),
    body('displayOrder')
        .optional()
        .isInt({ min: 0 }).withMessage('Display order must be a non-negative interger'),
    body('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be a boolean'),
    (req, res, next) => {
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
];
const router = Router();
router.get('/', getAllCategories);
router.get('/:id', authenticate, getCategoryById);
router.post('/', authenticate, categoryValidation, createCategory);
router.put('/:id', authenticate, updateCategory, updateCategory);
router.patch('/:id/status', authenticate, toggleCategoryStatus);
router.delete('/:id', authenticate, deleteCategory);
export default router;
//# sourceMappingURL=category.routes.js.map