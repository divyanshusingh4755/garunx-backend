import { Types } from "mongoose";
import { Permission } from "../models/permission.model.js";
import { RbacRole } from "../models/role.model.js";
import { User } from "../models/user.model.js";
import { Role } from "../types/rbac.js";

interface CreatePermissionParams {
    name: string;
    key: string;
    module: string;
    description?: string;
}

interface GetPermissionsParams {
    module?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
}

interface UpdatePermissionParams {
    permissionId: string;
    name?: string;
    key?: string;
    module?: string;
    description?: string;
}

interface CreateRoleParams {
    name: string;
    key: string;
    description?: string;
    permissions?: string[];
}

interface GetRolesParams {
    isActive?: boolean;
    page?: number;
    limit?: number;
}

interface UpdateRoleParams {
    roleId: string;
    name?: string;
    key?: string;
    description?: string;
}

interface AddRolePermissionsParams {
    roleId: string;
    permissions: string[];
}

export class RbacService {
    static async createPermission(
        params: CreatePermissionParams,
    ) {
        const {
            name,
            key,
            module,
            description,
        } = params;

        const normalizedKey = key
            .trim()
            .toLowerCase();

        const normalizedModule = module
            .trim()
            .toLowerCase();

        const keyModule = normalizedKey.split(".")[0];

        if (keyModule !== normalizedModule) {
            throw new Error(
                "Permission key module must match the module field",
            );
        }

        const existingPermission =
            await Permission.findOne({
                key: normalizedKey,
            }).lean();

        if (existingPermission) {
            throw new Error(
                "Permission with this key already exists",
            );
        }

        const permission = await Permission.create({
            name: name.trim(),
            key: normalizedKey,
            module: normalizedModule,
            ...(description !== undefined && {
                description: description.trim(),
            }),
        });

        return permission;
    }

    static async getPermissions(
        params: GetPermissionsParams,
    ) {
        const {
            module,
            isActive,
            page = 1,
            limit = 20,
        } = params;

        const query: Record<string, unknown> = {};

        if (module) {
            query.module = module.trim().toLowerCase();
        }

        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }

        const skip = (page - 1) * limit;

        const [permissions, total] = await Promise.all([
            Permission.find(query)
                .sort({
                    module: 1,
                    name: 1,
                })
                .skip(skip)
                .limit(limit)
                .lean(),

            Permission.countDocuments(query),
        ]);

        return {
            permissions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    static async getPermissionById(
        permissionId: string,
    ) {
        if (!Types.ObjectId.isValid(permissionId)) {
            throw new Error("Invalid permission ID");
        }

        const permission = await Permission.findById(
            permissionId,
        ).lean();

        if (!permission) {
            throw new Error("Permission not found");
        }

        return permission;
    }

    static async updatePermission(
        params: UpdatePermissionParams,
    ) {
        const {
            permissionId,
            name,
            key,
            module,
            description,
        } = params;

        if (!Types.ObjectId.isValid(permissionId)) {
            throw new Error("Invalid permission ID");
        }

        const permission =
            await Permission.findById(permissionId);

        if (!permission) {
            throw new Error("Permission not found");
        }

        if (name !== undefined) {
            permission.name = name.trim();
        }

        if (description !== undefined) {
            permission.description =
                description.trim();
        }

        const normalizedKey =
            key !== undefined
                ? key.trim().toLowerCase()
                : permission.key;

        const normalizedModule =
            module !== undefined
                ? module.trim().toLowerCase()
                : permission.module;

        const keyModule =
            normalizedKey.split(".")[0];

        if (keyModule !== normalizedModule) {
            throw new Error(
                "Permission key module must match the module field",
            );
        }

        if (normalizedKey !== permission.key) {
            const existingPermission =
                await Permission.findOne({
                    key: normalizedKey,
                    _id: {
                        $ne: permission._id,
                    },
                }).lean();

            if (existingPermission) {
                throw new Error(
                    "Permission with this key already exists",
                );
            }
        }

        permission.key = normalizedKey;
        permission.module = normalizedModule;

        await permission.save();

        return permission;
    }

    static async updatePermissionStatus(
        permissionId: string,
        isActive: boolean,
    ) {
        if (!Types.ObjectId.isValid(permissionId)) {
            throw new Error("Invalid permission ID");
        }

        const permission =
            await Permission.findById(permissionId);

        if (!permission) {
            throw new Error("Permission not found");
        }

        permission.isActive = isActive;

        await permission.save();

        return permission;
    }

    static async createRole(
        params: CreateRoleParams,
    ) {
        const {
            name,
            key,
            description,
            permissions = [],
        } = params;

        const normalizedKey = key
            .trim()
            .toUpperCase();

        const existingRole = await RbacRole.findOne({
            key: normalizedKey,
        }).lean();

        if (existingRole) {
            throw new Error(
                "Role with this key already exists",
            );
        }

        const uniquePermissionIds = [
            ...new Set(permissions),
        ];

        if (uniquePermissionIds.length > 0) {
            const foundPermissions =
                await Permission.find({
                    _id: {
                        $in: uniquePermissionIds,
                    },
                    isActive: true,
                })
                    .select("_id")
                    .lean();

            if (
                foundPermissions.length !==
                uniquePermissionIds.length
            ) {
                throw new Error(
                    "One or more permissions are invalid or inactive",
                );
            }
        }

        const permissionObjectIds =
            uniquePermissionIds.map(
                (id) => new Types.ObjectId(id),
            );

        const role = await RbacRole.create({
            name: name.trim(),
            key: normalizedKey,

            ...(description !== undefined && {
                description: description.trim(),
            }),

            permissions: permissionObjectIds,

            isSystem: false,
        });

        return role;
    }

    static async getRoles(
        params: GetRolesParams,
    ) {
        const {
            isActive,
            page = 1,
            limit = 20,
        } = params;

        const query: Record<string, unknown> = {};

        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }

        const skip = (page - 1) * limit;

        const [roles, total] = await Promise.all([
            RbacRole.find(query)
                .populate({
                    path: "permissions",
                    select:
                        "name key module description isActive",
                })
                .sort({
                    createdAt: -1,
                })
                .skip(skip)
                .limit(limit)
                .lean(),

            RbacRole.countDocuments(query),
        ]);

        return {
            roles,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    static async getRoleById(
        roleId: string,
    ) {
        if (!Types.ObjectId.isValid(roleId)) {
            throw new Error("Invalid role ID");
        }

        const role = await RbacRole.findById(roleId)
            .populate({
                path: "permissions",
                select:
                    "name key module description isActive",
            })
            .lean();

        if (!role) {
            throw new Error("Role not found");
        }

        return role;
    }

    static async updateRole(
        params: UpdateRoleParams,
    ) {
        const {
            roleId,
            name,
            key,
            description,
        } = params;

        if (!Types.ObjectId.isValid(roleId)) {
            throw new Error("Invalid role ID");
        }

        const role = await RbacRole.findById(roleId);

        if (!role) {
            throw new Error("Role not found");
        }

        if (role.isSystem) {
            throw new Error("System role cannot be modified");
        }

        if (name !== undefined) {
            role.name = name.trim();
        }

        if (description !== undefined) {
            role.description = description.trim();
        }

        if (key !== undefined) {
            const normalizedKey = key
                .trim()
                .toUpperCase();

            if (normalizedKey !== role.key) {
                const existingRole =
                    await RbacRole.findOne({
                        key: normalizedKey,
                        _id: {
                            $ne: role._id,
                        },
                    }).lean();

                if (existingRole) {
                    throw new Error(
                        "Role with this key already exists",
                    );
                }

                role.key = normalizedKey;
            }
        }

        await role.save();

        return role;
    }

    static async updateRoleStatus(
        roleId: string,
        isActive: boolean,
    ) {
        if (!Types.ObjectId.isValid(roleId)) {
            throw new Error("Invalid role ID");
        }

        const role = await RbacRole.findById(roleId);

        if (!role) {
            throw new Error("Role not found");
        }

        if (role.isSystem) {
            throw new Error(
                "System role status cannot be changed",
            );
        }

        role.isActive = isActive;

        await role.save();

        return role;
    }

    static async addRolePermissions(
        params: AddRolePermissionsParams,
    ) {
        const {
            roleId,
            permissions,
        } = params;

        if (!Types.ObjectId.isValid(roleId)) {
            throw new Error("Invalid role ID");
        }

        const role = await RbacRole.findById(roleId);

        if (!role) {
            throw new Error("Role not found");
        }

        if (role.isSystem) {
            throw new Error(
                "System role permissions cannot be modified",
            );
        }

        const uniquePermissionIds = [
            ...new Set(permissions),
        ];

        const foundPermissions =
            await Permission.find({
                _id: {
                    $in: uniquePermissionIds,
                },
                isActive: true,
            })
                .select("_id")
                .lean();

        if (
            foundPermissions.length !==
            uniquePermissionIds.length
        ) {
            throw new Error(
                "One or more permissions are invalid or inactive",
            );
        }

        const existingPermissionIds =
            new Set(
                role.permissions.map(
                    (permissionId) =>
                        permissionId.toString(),
                ),
            );

        const permissionsToAdd =
            uniquePermissionIds.filter(
                (permissionId) =>
                    !existingPermissionIds.has(
                        permissionId,
                    ),
            );

        if (permissionsToAdd.length > 0) {
            role.permissions.push(
                ...permissionsToAdd.map(
                    (permissionId) =>
                        new Types.ObjectId(
                            permissionId,
                        ),
                ),
            );

            await role.save();
        }

        return RbacRole.findById(roleId)
            .populate({
                path: "permissions",
                select:
                    "name key module description isActive",
            })
            .lean();
    }

    static async removeRolePermission(
        roleId: string,
        permissionId: string,
    ) {
        if (!Types.ObjectId.isValid(roleId)) {
            throw new Error("Invalid role ID");
        }

        if (
            !Types.ObjectId.isValid(
                permissionId,
            )
        ) {
            throw new Error(
                "Invalid permission ID",
            );
        }

        const role =
            await RbacRole.findById(roleId);

        if (!role) {
            throw new Error("Role not found");
        }

        if (role.isSystem) {
            throw new Error(
                "System role permissions cannot be modified",
            );
        }

        const hasPermission =
            role.permissions.some(
                (id) =>
                    id.toString() ===
                    permissionId,
            );

        if (!hasPermission) {
            throw new Error(
                "Permission is not assigned to this role",
            );
        }

        role.permissions =
            role.permissions.filter(
                (id) =>
                    id.toString() !==
                    permissionId,
            );

        await role.save();

        return RbacRole.findById(roleId)
            .populate({
                path: "permissions",
                select:
                    "name key module description isActive",
            })
            .lean();
    }

    static async assignRolesToUser(
        userId: string,
        roleIds: string[],
    ) {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }

        const user = await User.findById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        if (user.role !== Role.ADMIN) {
            throw new Error(
                "RBAC roles can only be assigned to admin users",
            );
        }

        const uniqueRoleIds = [
            ...new Set(roleIds),
        ];

        const roles = await RbacRole.find({
            _id: {
                $in: uniqueRoleIds,
            },
            isActive: true,
        })
            .select("_id")
            .lean();

        if (
            roles.length !==
            uniqueRoleIds.length
        ) {
            throw new Error(
                "One or more roles are invalid or inactive",
            );
        }

        user.rbacRoles =
            uniqueRoleIds.map(
                (roleId) =>
                    new Types.ObjectId(roleId),
            );

        await user.save();

        return User.findById(userId)
            .select(
                "_id userReference fullName email phoneNumber role rbacRoles",
            )
            .populate({
                path: "rbacRoles",
                select:
                    "name key description isActive isSystem permissions",
                populate: {
                    path: "permissions",
                    select:
                        "name key module description isActive",
                },
            })
            .lean();
    }

    static async removeAllRolesFromUser(
        userId: string,
    ) {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }

        const user = await User.findById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        user.rbacRoles = [];

        await user.save();

        return User.findById(userId)
            .select(
                "_id userReference fullName email phoneNumber role rbacRoles",
            )
            .lean();
    }

    static async removeRoleFromUser(
        userId: string,
        roleId: string,
    ) {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }

        if (!Types.ObjectId.isValid(roleId)) {
            throw new Error("Invalid role ID");
        }

        const user = await User.findById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        const hasRole = user.rbacRoles.some(
            (id) =>
                id.toString() === roleId,
        );

        if (!hasRole) {
            throw new Error(
                "Role is not assigned to this user",
            );
        }

        user.rbacRoles =
            user.rbacRoles.filter(
                (id) =>
                    id.toString() !== roleId,
            );

        await user.save();

        return User.findById(userId)
            .select(
                "_id userReference fullName email phoneNumber role rbacRoles",
            )
            .populate({
                path: "rbacRoles",
                select:
                    "name key description isActive isSystem",
            })
            .lean();
    }

    static async getUserAccess(
        userId: string,
    ) {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }

        const user = await User.findById(userId)
            .select(
                "_id userReference fullName email phoneNumber role rbacRoles",
            )
            .populate({
                path: "rbacRoles",
                match: {
                    isActive: true,
                },
                select:
                    "name key description isActive isSystem permissions",
                populate: {
                    path: "permissions",
                    match: {
                        isActive: true,
                    },
                    select:
                        "name key module description isActive",
                },
            })
            .lean();

        if (!user) {
            throw new Error("User not found");
        }

        return user;
    }
}