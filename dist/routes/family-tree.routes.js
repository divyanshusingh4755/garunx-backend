import { Router } from "express";
import { body, param, query } from "express-validator";
import { addFamilyMember, deleteFamilyMember, exportFamilyMembersCsv, getFamilyMemberActivities, getFamilyMemberById, getFamilyMembers, getFamilyTree, getFamilyTreeActivities, restoreFamilyMember, updateFamilyMember, } from "../controllers/family-tree-controllers.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { validate } from "../utils/validate.js";
import { Caste, FamilyRelation, Gender, Gotra, MemberLifeStatus, } from "../types/enums.js";
import { Role } from "../types/rbac.js";
import { requireAdminPermission } from "../middleware/requireAdminPermission.js";
import { requirePermission } from "../middleware/rbac.js";
const router = Router();
const FAMILY_TREE_ACTIVITY_ACTIONS = [
    "MEMBER_ADDED",
    "MEMBER_UPDATED",
    "MEMBER_DELETED",
    "MEMBER_RESTORED",
    "RELATIONSHIP_LINKED",
    "RELATIONSHIP_UNLINKED",
];
const addFamilyMemberValidation = [
    body("fullName")
        .notEmpty()
        .withMessage("Full name is required")
        .isString()
        .withMessage("Full name must be a string")
        .trim()
        .isLength({
        min: 2,
        max: 120,
    })
        .withMessage("Full name must be between 2 and 120 characters"),
    body("relation")
        .notEmpty()
        .withMessage("Family relation is required")
        .isIn(Object.values(FamilyRelation))
        .withMessage("Invalid family relation"),
    body("gender")
        .optional()
        .isIn(Object.values(Gender))
        .withMessage("Invalid gender"),
    body("dob")
        .optional({
        checkFalsy: true,
    })
        .isISO8601()
        .withMessage("DOB must be a valid date")
        .toDate(),
    body("lifeStatus")
        .optional()
        .isIn(Object.values(MemberLifeStatus))
        .withMessage("Invalid life status"),
    body("dateOfDeath")
        .optional({
        checkFalsy: true,
    })
        .isISO8601()
        .withMessage("Date of death must be a valid date")
        .toDate(),
    body("fatherId")
        .optional({
        nullable: true,
        checkFalsy: true,
    })
        .isMongoId()
        .withMessage("Invalid father ID"),
    body("motherId")
        .optional({
        nullable: true,
        checkFalsy: true,
    })
        .isMongoId()
        .withMessage("Invalid mother ID"),
    body("spouseIds")
        .optional()
        .isArray()
        .withMessage("Spouse IDs must be an array"),
    body("spouseIds.*").optional().isMongoId().withMessage("Invalid spouse ID"),
    body("nativeVillage")
        .optional()
        .isString()
        .withMessage("Native village must be a string")
        .trim()
        .isLength({
        max: 120,
    })
        .withMessage("Native village cannot exceed 120 characters"),
    body("state")
        .optional()
        .isString()
        .withMessage("State must be a string")
        .trim()
        .isLength({
        max: 120,
    })
        .withMessage("State cannot exceed 120 characters"),
    body("district")
        .optional()
        .isString()
        .withMessage("District must be a string")
        .trim()
        .isLength({
        max: 120,
    })
        .withMessage("District cannot exceed 120 characters"),
    body("caste")
        .optional({
        nullable: true,
        checkFalsy: true,
    })
        .isIn(Object.values(Caste))
        .withMessage("Invalid caste"),
    body("gotra")
        .optional({
        nullable: true,
        checkFalsy: true,
    })
        .isIn(Object.values(Gotra))
        .withMessage("Invalid gotra"),
    body("designatedPandit")
        .optional()
        .isString()
        .withMessage("Designated pandit must be a string")
        .trim()
        .isLength({
        max: 120,
    })
        .withMessage("Designated pandit cannot exceed 120 characters"),
    body("visitors")
        .optional()
        .isArray()
        .withMessage("Visitors must be an array"),
    body("visitors.*")
        .optional()
        .isString()
        .withMessage("Visitor must be a string")
        .trim()
        .isLength({
        min: 1,
        max: 120,
    })
        .withMessage("Visitor must be between 1 and 120 characters"),
    body("profileImage")
        .optional({
        nullable: true,
        checkFalsy: true,
    })
        .isString()
        .withMessage("Profile image must be a string"),
    body("notes")
        .optional()
        .isString()
        .withMessage("Notes must be a string")
        .trim()
        .isLength({
        max: 1000,
    })
        .withMessage("Notes cannot exceed 1000 characters"),
    body().custom((value) => {
        const dob = value.dob ? new Date(value.dob) : null;
        const dateOfDeath = value.dateOfDeath ? new Date(value.dateOfDeath) : null;
        if (dob && dob.getTime() > Date.now()) {
            throw new Error("DOB cannot be in the future");
        }
        if (dob && dateOfDeath && dateOfDeath < dob) {
            throw new Error("Date of death cannot be before DOB");
        }
        return true;
    }),
    body().custom((value) => {
        if (value.fatherId && value.motherId && value.fatherId === value.motherId) {
            throw new Error("Father and mother cannot be the same member");
        }
        if (value.lifeStatus === MemberLifeStatus.ALIVE && value.dateOfDeath) {
            throw new Error("Date of death cannot be provided for an alive member");
        }
        if (Array.isArray(value.spouseIds)) {
            const uniqueSpouseIds = new Set(value.spouseIds);
            if (uniqueSpouseIds.size !== value.spouseIds.length) {
                throw new Error("Duplicate spouse IDs are not allowed");
            }
        }
        return true;
    }),
    validate,
];
const updateFamilyMemberValidation = [
    param("id")
        .notEmpty()
        .withMessage("Family member ID is required")
        .isMongoId()
        .withMessage("Invalid family member ID"),
    body().custom((value) => {
        if (!value ||
            typeof value !== "object" ||
            Array.isArray(value)) {
            throw new Error("Request body must be an object");
        }
        const allowedFields = [
            "fullName",
            "relation",
            "gender",
            "dob",
            "lifeStatus",
            "dateOfDeath",
            "fatherId",
            "motherId",
            "spouseIds",
            "nativeVillage",
            "state",
            "district",
            "caste",
            "gotra",
            "designatedPandit",
            "visitors",
            "profileImage",
            "notes",
        ];
        const suppliedFields = Object.keys(value);
        if (suppliedFields.length === 0) {
            throw new Error("At least one field is required for update");
        }
        const invalidFields = suppliedFields.filter((field) => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid update fields: ${invalidFields.join(", ")}`);
        }
        return true;
    }),
    body("fullName")
        .optional()
        .isString()
        .withMessage("Full name must be a string")
        .trim()
        .isLength({
        min: 2,
        max: 120,
    })
        .withMessage("Full name must be between 2 and 120 characters"),
    body("relation")
        .optional()
        .isIn(Object.values(FamilyRelation))
        .withMessage("Invalid family relation"),
    body("gender")
        .optional()
        .isIn(Object.values(Gender))
        .withMessage("Invalid gender"),
    body("dob")
        .optional({
        nullable: true,
        checkFalsy: true,
    })
        .isISO8601()
        .withMessage("DOB must be a valid date")
        .toDate(),
    body("lifeStatus")
        .optional()
        .isIn(Object.values(MemberLifeStatus))
        .withMessage("Invalid life status"),
    body("dateOfDeath")
        .optional({
        nullable: true,
        checkFalsy: true,
    })
        .isISO8601()
        .withMessage("Date of death must be a valid date")
        .toDate(),
    body("fatherId")
        .optional({
        nullable: true,
        checkFalsy: true,
    })
        .isMongoId()
        .withMessage("Invalid father ID"),
    body("motherId")
        .optional({
        nullable: true,
        checkFalsy: true,
    })
        .isMongoId()
        .withMessage("Invalid mother ID"),
    body("spouseIds")
        .optional()
        .isArray()
        .withMessage("Spouse IDs must be an array"),
    body("spouseIds.*").optional().isMongoId().withMessage("Invalid spouse ID"),
    body("nativeVillage")
        .optional()
        .isString()
        .withMessage("Native village must be a string")
        .trim()
        .isLength({
        max: 120,
    })
        .withMessage("Native village cannot exceed 120 characters"),
    body("state")
        .optional()
        .isString()
        .withMessage("State must be a string")
        .trim()
        .isLength({
        max: 120,
    })
        .withMessage("State cannot exceed 120 characters"),
    body("district")
        .optional()
        .isString()
        .withMessage("District must be a string")
        .trim()
        .isLength({
        max: 120,
    })
        .withMessage("District cannot exceed 120 characters"),
    body("caste")
        .optional({
        nullable: true,
        checkFalsy: true,
    })
        .isIn(Object.values(Caste))
        .withMessage("Invalid caste"),
    body("gotra")
        .optional({
        nullable: true,
        checkFalsy: true,
    })
        .isIn(Object.values(Gotra))
        .withMessage("Invalid gotra"),
    body("designatedPandit")
        .optional()
        .isString()
        .withMessage("Designated pandit must be a string")
        .trim()
        .isLength({
        max: 120,
    })
        .withMessage("Designated pandit cannot exceed 120 characters"),
    body("visitors")
        .optional()
        .isArray()
        .withMessage("Visitors must be an array"),
    body("visitors.*")
        .optional()
        .isString()
        .withMessage("Visitor must be a string")
        .trim()
        .isLength({
        min: 1,
        max: 120,
    })
        .withMessage("Visitor must be between 1 and 120 characters"),
    body("profileImage")
        .optional({
        nullable: true,
        checkFalsy: true,
    })
        .isString()
        .withMessage("Profile image must be a string"),
    body("notes")
        .optional()
        .isString()
        .withMessage("Notes must be a string")
        .trim()
        .isLength({
        max: 1000,
    })
        .withMessage("Notes cannot exceed 1000 characters"),
    body().custom((value) => {
        const dob = value.dob ? new Date(value.dob) : null;
        const dateOfDeath = value.dateOfDeath ? new Date(value.dateOfDeath) : null;
        if (dob && dob.getTime() > Date.now()) {
            throw new Error("DOB cannot be in the future");
        }
        if (dob && dateOfDeath && dateOfDeath < dob) {
            throw new Error("Date of death cannot be before DOB");
        }
        return true;
    }),
    body().custom((value) => {
        if (value.fatherId && value.motherId && value.fatherId === value.motherId) {
            throw new Error("Father and mother cannot be the same member");
        }
        if (value.lifeStatus === MemberLifeStatus.ALIVE && value.dateOfDeath) {
            throw new Error("Date of death cannot be provided for an alive member");
        }
        if (Array.isArray(value.spouseIds)) {
            const uniqueSpouseIds = new Set(value.spouseIds);
            if (uniqueSpouseIds.size !== value.spouseIds.length) {
                throw new Error("Duplicate spouse IDs are not allowed");
            }
        }
        return true;
    }),
    validate,
];
const familyMemberIdValidation = [
    param("id")
        .notEmpty()
        .withMessage("Family member ID is required")
        .isMongoId()
        .withMessage("Invalid family member ID"),
    validate,
];
const deleteFamilyMemberValidation = [
    param("id")
        .notEmpty()
        .withMessage("Family member ID is required")
        .isMongoId()
        .withMessage("Invalid family member ID"),
    body("reason")
        .notEmpty()
        .withMessage("Deletion reason is required")
        .isString()
        .withMessage("Deletion reason must be a string")
        .trim()
        .isLength({
        min: 3,
        max: 500,
    })
        .withMessage("Deletion reason must be between 3 and 500 characters"),
    validate,
];
const getFamilyMembersValidation = [
    query("search")
        .optional()
        .isString()
        .withMessage("Search must be a string")
        .trim()
        .isLength({
        max: 120,
    })
        .withMessage("Search cannot exceed 120 characters"),
    query("relation")
        .optional()
        .isIn(Object.values(FamilyRelation))
        .withMessage("Invalid family relation"),
    query("gender")
        .optional()
        .isIn(Object.values(Gender))
        .withMessage("Invalid gender"),
    query("lifeStatus")
        .optional()
        .isIn(Object.values(MemberLifeStatus))
        .withMessage("Invalid life status"),
    query("page")
        .optional()
        .isInt({
        min: 1,
    })
        .withMessage("Page must be at least 1")
        .toInt(),
    query("limit")
        .optional()
        .isInt({
        min: 1,
        max: 100,
    })
        .withMessage("Limit must be between 1 and 100")
        .toInt(),
    validate,
];
const getFamilyTreeActivitiesValidation = [
    query("action")
        .optional()
        .isIn(FAMILY_TREE_ACTIVITY_ACTIONS)
        .withMessage("Invalid family tree activity action"),
    query("familyMemberId")
        .optional()
        .isMongoId()
        .withMessage("Invalid family member ID"),
    query("performedBy")
        .optional()
        .isMongoId()
        .withMessage("Invalid performed-by user ID"),
    query("bookingId").optional().isMongoId().withMessage("Invalid booking ID"),
    query("page")
        .optional()
        .isInt({
        min: 1,
    })
        .withMessage("Page must be at least 1")
        .toInt(),
    query("limit")
        .optional()
        .isInt({
        min: 1,
        max: 100,
    })
        .withMessage("Limit must be between 1 and 100")
        .toInt(),
    validate,
];
const getFamilyMemberActivitiesValidation = [
    param("id")
        .notEmpty()
        .withMessage("Family member ID is required")
        .isMongoId()
        .withMessage("Invalid family member ID"),
    query("page")
        .optional()
        .isInt({
        min: 1,
    })
        .withMessage("Page must be at least 1")
        .toInt(),
    query("limit")
        .optional()
        .isInt({
        min: 1,
        max: 100,
    })
        .withMessage("Limit must be between 1 and 100")
        .toInt(),
    validate,
];
const familyTreeOwnerIdValidation = [
    param("ownerId")
        .notEmpty()
        .withMessage("Family tree owner ID is required")
        .isMongoId()
        .withMessage("Invalid family tree owner ID"),
    validate,
];
const restoreFamilyMemberValidation = [
    param("id")
        .notEmpty()
        .withMessage("Family member ID is required")
        .isMongoId()
        .withMessage("Invalid family member ID"),
    body("reason")
        .optional()
        .isString()
        .withMessage("Restore reason must be a string")
        .trim()
        .isLength({
        min: 3,
        max: 500,
    })
        .withMessage("Restore reason must be between 3 and 500 characters"),
    validate,
];
const exportFamilyMembersValidation = [
    body("memberIds")
        .isArray({
        min: 1,
        max: 1000,
    })
        .withMessage("memberIds must contain between 1 and 1000 family member IDs"),
    body("memberIds.*")
        .isMongoId()
        .withMessage("Each memberId must be a valid MongoDB ID"),
    body("memberIds").custom((memberIds) => {
        if (!Array.isArray(memberIds)) {
            return true;
        }
        const uniqueIds = new Set(memberIds);
        if (uniqueIds.size !==
            memberIds.length) {
            throw new Error("Duplicate family member IDs are not allowed");
        }
        return true;
    }),
    validate,
];
router.use(authenticate);
/*
 * =========================================================
 * AUTHENTICATED USER - OWN FAMILY TREE
 * =========================================================
 */
router.post("/add-member", authorizeRoles(Role.USER), addFamilyMemberValidation, addFamilyMember);
router.get("/get-family-tree", authorizeRoles(Role.USER), getFamilyTree);
router.get("/get-members", authorizeRoles(Role.USER), getFamilyMembersValidation, getFamilyMembers);
router.get("/activities", authorizeRoles(Role.USER), getFamilyTreeActivitiesValidation, getFamilyTreeActivities);
router.post("/export", authorizeRoles(Role.USER), exportFamilyMembersValidation, exportFamilyMembersCsv);
/*
 * =========================================================
 * AUTHENTICATED USER - MEMBER-SPECIFIC ROUTES
 * =========================================================
 */
/*
 * More specific member activity route first.
 */
router.get("/get-member/:id/activities", authorizeRoles(Role.USER), getFamilyMemberActivitiesValidation, getFamilyMemberActivities);
router.get("/get-member/:id", authorizeRoles(Role.USER), familyMemberIdValidation, getFamilyMemberById);
router.patch("/update-member/:id", authorizeRoles(Role.USER), updateFamilyMemberValidation, updateFamilyMember);
router.patch("/restore-member/:id", authorizeRoles(Role.USER), restoreFamilyMemberValidation, restoreFamilyMember);
router.delete("/delete-member/:id", authorizeRoles(Role.USER), deleteFamilyMemberValidation, deleteFamilyMember);
/*
 * =========================================================
 * ADMIN / COORDINATOR - USER FAMILY TREE
 * =========================================================
 */
router.post("/users/:ownerId/add-member", authorizeRoles(Role.ADMIN, Role.COORDINATOR), requireAdminPermission("family_tree.create_any"), familyTreeOwnerIdValidation, addFamilyMemberValidation, addFamilyMember);
router.post("/users/:ownerId/export", authorizeRoles(Role.ADMIN, Role.COORDINATOR), requireAdminPermission("family_tree.read_any"), familyTreeOwnerIdValidation, exportFamilyMembersValidation, exportFamilyMembersCsv);
router.get("/users/:ownerId/get-family-tree", authorizeRoles(Role.ADMIN, Role.COORDINATOR), requireAdminPermission("family_tree.read_any"), familyTreeOwnerIdValidation, getFamilyTree);
router.get("/users/:ownerId/get-members", authorizeRoles(Role.ADMIN, Role.COORDINATOR), requireAdminPermission("family_tree.read_any"), familyTreeOwnerIdValidation, getFamilyMembersValidation, getFamilyMembers);
router.get("/users/:ownerId/activities", authorizeRoles(Role.ADMIN, Role.COORDINATOR), requireAdminPermission("family_tree.read_any"), familyTreeOwnerIdValidation, getFamilyTreeActivitiesValidation, getFamilyTreeActivities);
/*
 * =========================================================
 * ADMIN / COORDINATOR - MEMBER-SPECIFIC ROUTES
 * =========================================================
 */
/*
 * Keep the more-specific activity route
 * before the generic member detail route.
 */
router.get("/users/:ownerId/get-member/:id/activities", authorizeRoles(Role.ADMIN, Role.COORDINATOR), requireAdminPermission("family_tree.read_any"), familyTreeOwnerIdValidation, getFamilyMemberActivitiesValidation, getFamilyMemberActivities);
router.get("/users/:ownerId/get-member/:id", authorizeRoles(Role.ADMIN, Role.COORDINATOR), requireAdminPermission("family_tree.read_any"), familyTreeOwnerIdValidation, familyMemberIdValidation, getFamilyMemberById);
router.patch("/users/:ownerId/update-member/:id", authorizeRoles(Role.ADMIN, Role.COORDINATOR), requireAdminPermission("family_tree.update_any"), familyTreeOwnerIdValidation, updateFamilyMemberValidation, updateFamilyMember);
router.patch("/users/:ownerId/restore-member/:id", authorizeRoles(Role.ADMIN), requirePermission("family_tree.restore_any"), familyTreeOwnerIdValidation, restoreFamilyMemberValidation, restoreFamilyMember);
router.delete("/users/:ownerId/delete-member/:id", authorizeRoles(Role.ADMIN, Role.COORDINATOR), requireAdminPermission("family_tree.delete_any"), familyTreeOwnerIdValidation, deleteFamilyMemberValidation, deleteFamilyMember);
export default router;
//# sourceMappingURL=family-tree.routes.js.map