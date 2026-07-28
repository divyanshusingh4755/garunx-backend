import { Router } from "express";
import { body, param, query, } from "express-validator";
import { addFamilyMember, deleteFamilyMember, getFamilyMemberActivities, getFamilyMemberById, getFamilyMembers, getFamilyTree, getFamilyTreeActivities, restoreFamilyMember, updateFamilyMember, } from "../controllers/family-tree-controllers.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { validate } from "../utils/validate.js";
import { Caste, FamilyRelation, Gender, Gotra, MemberLifeStatus, } from "../types/enums.js";
import { Role } from "../types/rbac.js";
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
    body("spouseIds.*")
        .optional()
        .isMongoId()
        .withMessage("Invalid spouse ID"),
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
        if (value.fatherId &&
            value.motherId &&
            value.fatherId ===
                value.motherId) {
            throw new Error("Father and mother cannot be the same member");
        }
        if (value.lifeStatus ===
            MemberLifeStatus.ALIVE &&
            value.dateOfDeath) {
            throw new Error("Date of death cannot be provided for an alive member");
        }
        if (Array.isArray(value.spouseIds)) {
            const uniqueSpouseIds = new Set(value.spouseIds);
            if (uniqueSpouseIds.size !==
                value.spouseIds.length) {
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
            typeof value !==
                "object" ||
            Array.isArray(value) ||
            Object.keys(value).length ===
                0) {
            throw new Error("At least one field is required for update");
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
    body("spouseIds.*")
        .optional()
        .isMongoId()
        .withMessage("Invalid spouse ID"),
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
        if (value.fatherId &&
            value.motherId &&
            value.fatherId ===
                value.motherId) {
            throw new Error("Father and mother cannot be the same member");
        }
        if (value.lifeStatus ===
            MemberLifeStatus.ALIVE &&
            value.dateOfDeath) {
            throw new Error("Date of death cannot be provided for an alive member");
        }
        if (Array.isArray(value.spouseIds)) {
            const uniqueSpouseIds = new Set(value.spouseIds);
            if (uniqueSpouseIds.size !==
                value.spouseIds.length) {
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
    query("bookingId")
        .optional()
        .isMongoId()
        .withMessage("Invalid booking ID"),
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
router.use(authenticate);
/*
 * Authenticated user's own family tree.
 */
router.post("/add-member", addFamilyMemberValidation, addFamilyMember);
router.get("/get-family-tree", getFamilyTree);
router.get("/get-members", getFamilyMembersValidation, getFamilyMembers);
router.get("/get-member/:id", familyMemberIdValidation, getFamilyMemberById);
router.patch("/update-member/:id", updateFamilyMemberValidation, updateFamilyMember);
router.patch("/restore-member/:id", restoreFamilyMemberValidation, restoreFamilyMember);
router.delete("/delete-member/:id", deleteFamilyMemberValidation, deleteFamilyMember);
router.get("/activities", getFamilyTreeActivitiesValidation, getFamilyTreeActivities);
router.get("/get-member/:id/activities", getFamilyMemberActivitiesValidation, getFamilyMemberActivities);
/*
 * Admin or coordinator access to another
 * user's family tree.
 */
router.post("/users/:ownerId/add-member", authorizeRoles(Role.ADMIN, Role.COORDINATOR), familyTreeOwnerIdValidation, addFamilyMemberValidation, addFamilyMember);
router.get("/users/:ownerId/get-family-tree", authorizeRoles(Role.ADMIN, Role.COORDINATOR), familyTreeOwnerIdValidation, getFamilyTree);
router.get("/users/:ownerId/get-members", authorizeRoles(Role.ADMIN, Role.COORDINATOR), familyTreeOwnerIdValidation, getFamilyMembersValidation, getFamilyMembers);
router.get("/users/:ownerId/get-member/:id", authorizeRoles(Role.ADMIN, Role.COORDINATOR), familyTreeOwnerIdValidation, familyMemberIdValidation, getFamilyMemberById);
router.patch("/users/:ownerId/update-member/:id", authorizeRoles(Role.ADMIN, Role.COORDINATOR), familyTreeOwnerIdValidation, updateFamilyMemberValidation, updateFamilyMember);
router.patch("/users/:ownerId/restore-member/:id", authorizeRoles(Role.ADMIN), familyTreeOwnerIdValidation, restoreFamilyMemberValidation, restoreFamilyMember);
router.delete("/users/:ownerId/delete-member/:id", authorizeRoles(Role.ADMIN, Role.COORDINATOR), familyTreeOwnerIdValidation, deleteFamilyMemberValidation, deleteFamilyMember);
router.get("/users/:ownerId/activities", authorizeRoles(Role.ADMIN, Role.COORDINATOR), familyTreeOwnerIdValidation, getFamilyTreeActivitiesValidation, getFamilyTreeActivities);
router.get("/users/:ownerId/get-member/:id/activities", authorizeRoles(Role.ADMIN, Role.COORDINATOR), familyTreeOwnerIdValidation, getFamilyMemberActivitiesValidation, getFamilyMemberActivities);
export default router;
//# sourceMappingURL=family-tree.routes.js.map