import { Router } from "express";
import { body, param, query } from "express-validator";
import { addFamilyMember, getFamilyTree, getFamilyMembers, getFamilyMemberById, updateFamilyMember, deleteFamilyMember, } from "../controllers/family-tree-controllers.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../utils/validate.js";
import { Caste, FamilyRelation, Gender, Gotra, MemberLifeStatus, } from "../types/enums.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
const router = Router();
const addFamilyMemberValidation = [
    body("fullName")
        .notEmpty()
        .withMessage("Full name is required")
        .isString()
        .trim()
        .isLength({ min: 2, max: 120 })
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
        .optional({ checkFalsy: true })
        .isISO8601()
        .withMessage("DOB must be a valid date")
        .toDate(),
    body("lifeStatus")
        .optional()
        .isIn(Object.values(MemberLifeStatus))
        .withMessage("Invalid life status"),
    body("dateOfDeath")
        .optional({ checkFalsy: true })
        .isISO8601()
        .withMessage("Date of death must be a valid date")
        .toDate(),
    body("fatherId")
        .optional({ checkFalsy: true })
        .isMongoId()
        .withMessage("Invalid father ID"),
    body("motherId")
        .optional({ checkFalsy: true })
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
        .trim()
        .isLength({ max: 120 }),
    body("state")
        .optional()
        .isString()
        .trim()
        .isLength({ max: 120 }),
    body("district")
        .optional()
        .isString()
        .trim()
        .isLength({ max: 120 }),
    body("caste")
        .optional({ checkFalsy: true })
        .isIn(Object.values(Caste))
        .withMessage("Invalid caste"),
    body("gotra")
        .optional({ checkFalsy: true })
        .isIn(Object.values(Gotra))
        .withMessage("Invalid gotra"),
    body("designatedPandit")
        .optional()
        .isString()
        .trim()
        .isLength({ max: 120 }),
    body("visitors")
        .optional()
        .isArray()
        .withMessage("Visitors must be an array"),
    body("visitors.*")
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 120 }),
    body("profileImage")
        .optional({ checkFalsy: true })
        .isString(),
    body("notes")
        .optional()
        .isString()
        .trim()
        .isLength({ max: 1000 }),
    body().custom((value) => {
        if (value.fatherId &&
            value.motherId &&
            value.fatherId === value.motherId) {
            throw new Error("Father and mother cannot be the same member");
        }
        return true;
    }),
    validate,
];
const updateFamilyMemberValidation = [
    body().custom((value) => {
        if (!value ||
            typeof value !== "object" ||
            Object.keys(value).length === 0) {
            throw new Error("At least one field is required for update");
        }
        return true;
    }),
    param("id")
        .isMongoId()
        .withMessage("Invalid family member ID"),
    body("fullName")
        .optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 120 }),
    body("relation")
        .optional()
        .isIn(Object.values(FamilyRelation))
        .withMessage("Invalid family relation"),
    body("gender")
        .optional()
        .isIn(Object.values(Gender))
        .withMessage("Invalid gender"),
    body("dob")
        .optional({ checkFalsy: true })
        .isISO8601()
        .withMessage("DOB must be a valid date")
        .toDate(),
    body("lifeStatus")
        .optional()
        .isIn(Object.values(MemberLifeStatus))
        .withMessage("Invalid life status"),
    body("dateOfDeath")
        .optional({ checkFalsy: true })
        .isISO8601()
        .withMessage("Date of death must be a valid date")
        .toDate(),
    body("fatherId")
        .optional({ checkFalsy: true })
        .isMongoId()
        .withMessage("Invalid father ID"),
    body("motherId")
        .optional({ checkFalsy: true })
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
        .trim()
        .isLength({ max: 120 }),
    body("state")
        .optional()
        .isString()
        .trim()
        .isLength({ max: 120 }),
    body("district")
        .optional()
        .isString()
        .trim()
        .isLength({ max: 120 }),
    body("caste")
        .optional({ checkFalsy: true })
        .isIn(Object.values(Caste))
        .withMessage("Invalid caste"),
    body("gotra")
        .optional({ checkFalsy: true })
        .isIn(Object.values(Gotra))
        .withMessage("Invalid gotra"),
    body("designatedPandit")
        .optional()
        .isString()
        .trim()
        .isLength({ max: 120 }),
    body("visitors")
        .optional()
        .isArray()
        .withMessage("Visitors must be an array"),
    body("visitors.*")
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 120 }),
    body("profileImage")
        .optional({ checkFalsy: true })
        .isString(),
    body("notes")
        .optional()
        .isString()
        .trim()
        .isLength({ max: 1000 }),
    body().custom((value) => {
        if (value.fatherId &&
            value.motherId &&
            value.fatherId === value.motherId) {
            throw new Error("Father and mother cannot be the same member");
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
const getFamilyMembersValidation = [
    query("search")
        .optional()
        .isString()
        .trim()
        .isLength({ max: 120 }),
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
        .isInt({ min: 1 })
        .toInt(),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
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
router.use(authenticate);
router.post("/add-member", addFamilyMemberValidation, addFamilyMember);
router.get("/get-family-tree", getFamilyTree);
router.get("/get-members", getFamilyMembersValidation, getFamilyMembers);
router.get("/get-member/:id", familyMemberIdValidation, getFamilyMemberById);
router.patch("/update-member/:id", updateFamilyMemberValidation, updateFamilyMember);
router.delete("/delete-member/:id", familyMemberIdValidation, deleteFamilyMember);
// For coordinator or Admin
router.post("/users/:ownerId/add-member", authorizeRoles(Role.ADMIN, Role.COORDINATOR), familyTreeOwnerIdValidation, addFamilyMemberValidation, addFamilyMember);
router.get("/users/:ownerId/get-family-tree", authorizeRoles(Role.ADMIN, Role.COORDINATOR), familyTreeOwnerIdValidation, validate, getFamilyTree);
router.get("/users/:ownerId/get-members", authorizeRoles(Role.ADMIN, Role.COORDINATOR), familyTreeOwnerIdValidation, getFamilyMembersValidation, getFamilyMembers);
router.get("/users/:ownerId/get-member/:id", authorizeRoles(Role.ADMIN, Role.COORDINATOR), familyTreeOwnerIdValidation, familyMemberIdValidation, getFamilyMemberById);
router.patch("/users/:ownerId/update-member/:id", authorizeRoles(Role.ADMIN, Role.COORDINATOR), familyTreeOwnerIdValidation, updateFamilyMemberValidation, updateFamilyMember);
router.delete("/users/:ownerId/delete-member/:id", authorizeRoles(Role.ADMIN, Role.COORDINATOR), familyTreeOwnerIdValidation, familyMemberIdValidation, deleteFamilyMember);
// router.post(
//     "/users/:ownerId/add-member",
//     hasPermission(
//         Permission.FAMILY_TREE_CREATE_ANY,
//     ),
//     familyTreeOwnerIdRules,
//     addFamilyMemberRules,
//     validate,
//     addFamilyMember,
// );
// router.get(
//     "/users/:ownerId/get-family-tree",
//     hasPermission(
//         Permission.FAMILY_TREE_READ_ANY,
//     ),
//     familyTreeOwnerIdRules,
//     validate,
//     getFamilyTree,
// );
// router.get(
//     "/users/:ownerId/get-members",
//     hasPermission(
//         Permission.FAMILY_TREE_READ_ANY,
//     ),
//     familyTreeOwnerIdRules,
//     getFamilyMembersRules,
//     validate,
//     getFamilyMembers,
// );
// router.get(
//     "/users/:ownerId/get-member/:id",
//     hasPermission(
//         Permission.FAMILY_TREE_READ_ANY,
//     ),
//     familyTreeOwnerIdRules,
//     familyMemberIdRules,
//     validate,
//     getFamilyMemberById,
// );
// router.patch(
//     "/users/:ownerId/update-member/:id",
//     hasPermission(
//         Permission.FAMILY_TREE_UPDATE_ANY,
//     ),
//     familyTreeOwnerIdRules,
//     updateFamilyMemberRules,
//     validate,
//     updateFamilyMember,
// );
// router.delete(
//     "/users/:ownerId/delete-member/:id",
//     hasPermission(
//         Permission.FAMILY_TREE_DELETE_ANY,
//     ),
//     familyTreeOwnerIdRules,
//     familyMemberIdRules,
//     validate,
//     deleteFamilyMember,
// );
export default router;
//# sourceMappingURL=family-tree.routes.js.map