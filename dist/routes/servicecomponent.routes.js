import { Router, } from "express";
import { param, body, validationResult, } from "express-validator";
import { bulkUpsertServiceComponents, replaceServiceComponents, getComponentsByServiceAndTier, updateServiceComponent, } from "../controllers/servicecomponent.controllers.js";
import { authenticate } from "../middleware/authenticate.js";
const router = Router();
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json({
            success: false,
            message: firstError?.msg ?? "Validation failed",
            error: firstError,
        });
    }
    next();
};
const componentEntryValidation = [
    body("components")
        .isArray()
        .withMessage("components must be an array"),
    body("components.*.componentId")
        .notEmpty()
        .withMessage("componentId is required")
        .isMongoId()
        .withMessage("Invalid componentId"),
    body("components.*.isRequired")
        .optional()
        .isBoolean()
        .withMessage("isRequired must be boolean"),
    body("components.*.items")
        .optional()
        .isArray()
        .withMessage("items must be an array"),
    body("components.*.items.*")
        .optional()
        .custom((value) => {
        const itemId = typeof value === "string"
            ? value
            : value?.itemId;
        if (typeof itemId !== "string" ||
            !/^[a-f\d]{24}$/i.test(itemId)) {
            throw new Error("Invalid itemId");
        }
        return true;
    }),
];
const bulkValidation = [
    body("serviceId")
        .notEmpty()
        .withMessage("serviceId is required")
        .isMongoId()
        .withMessage("Invalid serviceId"),
    body("tierId")
        .notEmpty()
        .withMessage("tierId is required")
        .isMongoId()
        .withMessage("Invalid tierId"),
    ...componentEntryValidation,
    validate,
];
const serviceTierValidation = [
    param("serviceId")
        .isMongoId()
        .withMessage("Invalid serviceId"),
    param("tierId")
        .isMongoId()
        .withMessage("Invalid tierId"),
    validate,
];
const patchValidation = [
    body("serviceId")
        .notEmpty()
        .withMessage("serviceId is required")
        .isMongoId()
        .withMessage("Invalid serviceId"),
    body("tierId")
        .notEmpty()
        .withMessage("tierId is required")
        .isMongoId()
        .withMessage("Invalid tierId"),
    body("componentId")
        .notEmpty()
        .withMessage("componentId is required")
        .isMongoId()
        .withMessage("Invalid componentId"),
    body().custom((value) => {
        const allowedFields = [
            "serviceId",
            "tierId",
            "componentId",
            "isRequired",
            "name",
            "items",
        ];
        const suppliedFields = Object.keys(value ?? {});
        const invalidFields = suppliedFields.filter((field) => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid update fields: ${invalidFields.join(", ")}`);
        }
        const updateFields = suppliedFields.filter((field) => !["serviceId", "tierId", "componentId"].includes(field));
        if (updateFields.length === 0) {
            throw new Error("At least one update field is required");
        }
        return true;
    }),
    body("isRequired")
        .optional()
        .isBoolean()
        .withMessage("isRequired must be boolean"),
    body("name")
        .optional()
        .isString()
        .withMessage("name must be a string")
        .trim()
        .notEmpty()
        .withMessage("name cannot be empty"),
    body("items")
        .optional()
        .isArray()
        .withMessage("items must be an array"),
    body("items.*")
        .optional()
        .custom((value) => {
        const itemId = typeof value === "string"
            ? value
            : value?.itemId;
        if (typeof itemId !== "string" ||
            !/^[a-f\d]{24}$/i.test(itemId)) {
            throw new Error("Invalid itemId");
        }
        return true;
    }),
    validate,
];
router.post("/bulk", authenticate, bulkValidation, bulkUpsertServiceComponents);
router.put("/replace", authenticate, bulkValidation, replaceServiceComponents);
router.get("/:serviceId/:tierId", authenticate, serviceTierValidation, getComponentsByServiceAndTier);
router.patch("/", authenticate, patchValidation, updateServiceComponent);
export default router;
//# sourceMappingURL=servicecomponent.routes.js.map