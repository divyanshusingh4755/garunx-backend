import { Types } from "mongoose";
import { Permission } from "../models/permission.model.js";
import { RbacRole } from "../models/role.model.js";
import { User } from "../models/user.model.js";
import { Role } from "../types/rbac.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";
export class RbacService {
    static async invalidatePermissionCaches(permissionId) {
        const operations = [
            RedisCacheService.deleteByPattern(CacheKeys.rbacPermissionListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.rbacRoleListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.rbacRoleDetailPattern()),
            // Permission changes can affect every user's effective access.
            RedisCacheService.deleteByPattern(CacheKeys.rbacUserAccessPattern()),
        ];
        if (permissionId) {
            operations.push(RedisCacheService.delete(CacheKeys.rbacPermissionDetail(permissionId)));
        }
        await Promise.all(operations);
    }
    static async invalidateRoleCaches(roleId) {
        const operations = [
            RedisCacheService.deleteByPattern(CacheKeys.rbacRoleListPattern()),
            // Role changes can affect users assigned to that role. Broad invalidation is safer here.
            RedisCacheService.deleteByPattern(CacheKeys.rbacUserAccessPattern()),
        ];
        if (roleId) {
            operations.push(RedisCacheService.delete(CacheKeys.rbacRoleDetail(roleId)));
        }
        await Promise.all(operations);
    }
    static async invalidateUserAccessCache(userId) {
        await RedisCacheService.delete(CacheKeys.rbacUserAccess(userId));
    }
    static async createPermission(params) {
        const { name, key, module, description } = params;
        const normalizedKey = key.trim().toLowerCase();
        const normalizedModule = module.trim().toLowerCase();
        const keyModule = normalizedKey.split(".")[0];
        if (keyModule !== normalizedModule) {
            throw new Error("Permission key module must match the module field");
        }
        const existingPermission = await Permission.findOne({ key: normalizedKey }).lean();
        if (existingPermission) {
            throw new Error("Permission with this key already exists");
        }
        const permission = await Permission.create({ name: name.trim(), key: normalizedKey, module: normalizedModule, ...(description !== undefined && { description: description.trim() }) });
        await this.invalidatePermissionCaches();
        return permission;
    }
    static async getPermissions(params) {
        const { module, isActive, page = 1, limit = 20 } = params;
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
        const normalizedModule = module?.trim().toLowerCase();
        const cacheKey = CacheKeys.rbacPermissionList({ module: normalizedModule, isActive, page: safePage, limit: safeLimit });
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS.RBAC_PERMISSION_LIST,
            loader: async () => {
                const query = {};
                if (normalizedModule) {
                    query.module = normalizedModule;
                }
                if (typeof isActive === "boolean") {
                    query.isActive = isActive;
                }
                const skip = (safePage - 1) * safeLimit;
                const [permissions, total] = await Promise.all([
                    Permission.find(query).sort({ module: 1, name: 1 }).skip(skip).limit(safeLimit).lean(),
                    Permission.countDocuments(query),
                ]);
                return {
                    permissions,
                    pagination: {
                        page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit),
                    },
                };
            },
        });
    }
    static async getPermissionById(permissionId) {
        if (!Types.ObjectId.isValid(permissionId)) {
            throw new Error("Invalid permission ID");
        }
        return RedisCacheService.getOrSet({
            key: CacheKeys.rbacPermissionDetail(permissionId),
            ttlSeconds: CACHE_TTL_SECONDS.RBAC_PERMISSION_DETAIL,
            loader: async () => {
                const permission = await Permission.findById(permissionId).lean();
                if (!permission) {
                    throw new Error("Permission not found");
                }
                return permission;
            },
        });
    }
    static async updatePermission(params) {
        const { permissionId, name, key, module, description } = params;
        if (!Types.ObjectId.isValid(permissionId)) {
            throw new Error("Invalid permission ID");
        }
        const permission = await Permission.findById(permissionId);
        if (!permission) {
            throw new Error("Permission not found");
        }
        if (name !== undefined) {
            permission.name = name.trim();
        }
        if (description !== undefined) {
            permission.description = description.trim();
        }
        const normalizedKey = key !== undefined ? key.trim().toLowerCase() : permission.key;
        const normalizedModule = module !== undefined ? module.trim().toLowerCase() : permission.module;
        const keyModule = normalizedKey.split(".")[0];
        if (keyModule !== normalizedModule) {
            throw new Error("Permission key module must match the module field");
        }
        if (normalizedKey !== permission.key) {
            const existingPermission = await Permission.findOne({ key: normalizedKey, _id: { $ne: permission._id } }).lean();
            if (existingPermission) {
                throw new Error("Permission with this key already exists");
            }
        }
        permission.key = normalizedKey;
        permission.module = normalizedModule;
        await permission.save();
        await this.invalidatePermissionCaches(permissionId);
        return permission;
    }
    static async updatePermissionStatus(permissionId, isActive) {
        if (!Types.ObjectId.isValid(permissionId)) {
            throw new Error("Invalid permission ID");
        }
        const permission = await Permission.findById(permissionId);
        if (!permission) {
            throw new Error("Permission not found");
        }
        permission.isActive = isActive;
        await permission.save();
        await this.invalidatePermissionCaches(permissionId);
        return permission;
    }
    static async createRole(params) {
        const { name, key, description, permissions = [] } = params;
        const normalizedKey = key.trim().toUpperCase();
        const existingRole = await RbacRole.findOne({ key: normalizedKey }).lean();
        if (existingRole) {
            throw new Error("Role with this key already exists");
        }
        const uniquePermissionIds = [...new Set(permissions)];
        if (uniquePermissionIds.length > 0) {
            const foundPermissions = await Permission.find({ _id: { $in: uniquePermissionIds }, isActive: true }).select("_id").lean();
            if (foundPermissions.length !== uniquePermissionIds.length) {
                throw new Error("One or more permissions are invalid or inactive");
            }
        }
        const permissionObjectIds = uniquePermissionIds.map((id) => new Types.ObjectId(id));
        const role = await RbacRole.create({
            name: name.trim(),
            key: normalizedKey,
            ...(description !== undefined && {
                description: description.trim(),
            }),
            permissions: permissionObjectIds,
            isSystem: false,
        });
        await RedisCacheService.deleteByPattern(CacheKeys.rbacRoleListPattern());
        return role;
    }
    static async getRoles(params) {
        const { isActive, page = 1, limit = 20 } = params;
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
        const cacheKey = CacheKeys.rbacRoleList({ isActive, page: safePage, limit: safeLimit });
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS.RBAC_ROLE_LIST,
            loader: async () => {
                const query = {};
                if (typeof isActive === "boolean") {
                    query.isActive = isActive;
                }
                const skip = (safePage - 1) * safeLimit;
                const [roles, total] = await Promise.all([
                    RbacRole.find(query).populate({ path: "permissions", select: "name key module description isActive" }).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
                    RbacRole.countDocuments(query),
                ]);
                return {
                    roles,
                    pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
                };
            },
        });
    }
    static async getRoleById(roleId) {
        if (!Types.ObjectId.isValid(roleId)) {
            throw new Error("Invalid role ID");
        }
        return RedisCacheService.getOrSet({
            key: CacheKeys.rbacRoleDetail(roleId),
            ttlSeconds: CACHE_TTL_SECONDS.RBAC_ROLE_DETAIL,
            loader: async () => {
                const role = await RbacRole.findById(roleId).populate({ path: "permissions", select: "name key module description isActive" }).lean();
                if (!role) {
                    throw new Error("Role not found");
                }
                return role;
            },
        });
    }
    static async updateRole(params) {
        const { roleId, name, key, description } = params;
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
            const normalizedKey = key.trim().toUpperCase();
            if (normalizedKey !== role.key) {
                const existingRole = await RbacRole.findOne({ key: normalizedKey, _id: { $ne: role._id } }).lean();
                if (existingRole) {
                    throw new Error("Role with this key already exists");
                }
                role.key = normalizedKey;
            }
        }
        await role.save();
        await this.invalidateRoleCaches(roleId);
        return role;
    }
    static async updateRoleStatus(roleId, isActive) {
        if (!Types.ObjectId.isValid(roleId)) {
            throw new Error("Invalid role ID");
        }
        const role = await RbacRole.findById(roleId);
        if (!role) {
            throw new Error("Role not found");
        }
        if (role.isSystem) {
            throw new Error("System role status cannot be changed");
        }
        role.isActive = isActive;
        await role.save();
        await this.invalidateRoleCaches(roleId);
        return role;
    }
    static async addRolePermissions(params) {
        const { roleId, permissions } = params;
        if (!Types.ObjectId.isValid(roleId)) {
            throw new Error("Invalid role ID");
        }
        const role = await RbacRole.findById(roleId);
        if (!role) {
            throw new Error("Role not found");
        }
        if (role.isSystem) {
            throw new Error("System role permissions cannot be modified");
        }
        const uniquePermissionIds = [...new Set(permissions)];
        const foundPermissions = await Permission.find({ _id: { $in: uniquePermissionIds }, isActive: true }).select("_id").lean();
        if (foundPermissions.length !== uniquePermissionIds.length) {
            throw new Error("One or more permissions are invalid or inactive");
        }
        const existingPermissionIds = new Set(role.permissions.map((permissionId) => permissionId.toString()));
        const permissionsToAdd = uniquePermissionIds.filter((permissionId) => !existingPermissionIds.has(permissionId));
        if (permissionsToAdd.length > 0) {
            role.permissions.push(...permissionsToAdd.map((permissionId) => new Types.ObjectId(permissionId)));
            await role.save();
        }
        const updatedRole = await RbacRole.findById(roleId).populate({ path: "permissions", select: "name key module description isActive" }).lean();
        await this.invalidateRoleCaches(roleId);
        return updatedRole;
    }
    static async removeRolePermission(roleId, permissionId) {
        if (!Types.ObjectId.isValid(roleId)) {
            throw new Error("Invalid role ID");
        }
        if (!Types.ObjectId.isValid(permissionId)) {
            throw new Error("Invalid permission ID");
        }
        const role = await RbacRole.findById(roleId);
        if (!role) {
            throw new Error("Role not found");
        }
        if (role.isSystem) {
            throw new Error("System role permissions cannot be modified");
        }
        const hasPermission = role.permissions.some((id) => id.toString() === permissionId);
        if (!hasPermission) {
            throw new Error("Permission is not assigned to this role");
        }
        role.permissions = role.permissions.filter((id) => id.toString() !== permissionId);
        await role.save();
        await this.invalidateRoleCaches(roleId);
        return RbacRole.findById(roleId).populate({ path: "permissions", select: "name key module description isActive" }).lean();
    }
    static async assignRolesToUser(userId, roleIds) {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        if (user.role !== Role.ADMIN) {
            throw new Error("RBAC roles can only be assigned to admin users");
        }
        const uniqueRoleIds = [...new Set(roleIds)];
        const roles = await RbacRole.find({ _id: { $in: uniqueRoleIds }, isActive: true, isSystem: false }).select("_id").lean();
        if (roles.length !== uniqueRoleIds.length) {
            throw new Error("One or more roles are invalid, inactive, or cannot be assigned");
        }
        user.rbacRoles = uniqueRoleIds.map((roleId) => new Types.ObjectId(roleId));
        await user.save();
        await this.invalidateUserAccessCache(userId);
        return User.findById(userId)
            .select("_id userReference fullName email phoneNumber role rbacRoles")
            .populate({
            path: "rbacRoles", select: "name key description isActive isSystem permissions",
            populate: { path: "permissions", select: "name key module description isActive" },
        })
            .lean();
    }
    static async removeAllRolesFromUser(userId) {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        user.rbacRoles = [];
        await user.save();
        await this.invalidateUserAccessCache(userId);
        return User.findById(userId).select("_id userReference fullName email phoneNumber role rbacRoles").lean();
    }
    static async removeRoleFromUser(userId, roleId) {
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
        const hasRole = user.rbacRoles.some((id) => id.toString() === roleId);
        if (!hasRole) {
            throw new Error("Role is not assigned to this user");
        }
        user.rbacRoles = user.rbacRoles.filter((id) => id.toString() !== roleId);
        await user.save();
        await this.invalidateUserAccessCache(userId);
        return User.findById(userId)
            .select("_id userReference fullName email phoneNumber role rbacRoles")
            .populate({ path: "rbacRoles", select: "name key description isActive isSystem" })
            .lean();
    }
    static async getUserAccess(userId) {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }
        return RedisCacheService.getOrSet({
            key: CacheKeys.rbacUserAccess(userId),
            ttlSeconds: CACHE_TTL_SECONDS.RBAC_USER_ACCESS,
            loader: async () => {
                const user = await User.findById(userId)
                    .select("_id userReference fullName email phoneNumber role rbacRoles")
                    .populate({
                    path: "rbacRoles", match: { isActive: true },
                    select: "name key description isActive isSystem permissions",
                    populate: {
                        path: "permissions", match: { isActive: true },
                        select: "name key module description isActive",
                    },
                })
                    .lean();
                if (!user) {
                    throw new Error("User not found");
                }
                return user;
            },
        });
    }
    static async exportRolesToCsv(roleIds) {
        if (!Array.isArray(roleIds) || roleIds.length === 0) {
            throw new Error("At least one role ID is required");
        }
        const uniqueRoleIds = [...new Set(roleIds)];
        // Defensive validation because service methods should not rely only on the route.
        if (uniqueRoleIds.some((roleId) => !Types.ObjectId.isValid(roleId))) {
            throw new Error("One or more role IDs are invalid");
        }
        const roles = await RbacRole.find({ _id: { $in: uniqueRoleIds.map((roleId) => new Types.ObjectId(roleId)) } })
            .select("name key description permissions isActive isSystem createdAt updatedAt")
            .populate({ path: "permissions", select: "name key module isActive" })
            .lean();
        if (roles.length === 0) {
            throw new Error("No roles found for export");
        }
        // Keep output order the same as the roleIds received from frontend.
        const roleMap = new Map(roles.map((role) => [role._id.toString(), role]));
        const orderedRoles = uniqueRoleIds.map((roleId) => roleMap.get(roleId)).filter((role) => role !== undefined);
        const escapeCsv = (value) => {
            if (value === null || value === undefined) {
                return "";
            }
            const stringValue = String(value);
            // CSV formula injection protection. Excel may interpret cells beginning with =, +, -, or @ as formulas.
            const safeValue = /^[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue;
            if (safeValue.includes(",") || safeValue.includes('"') || safeValue.includes("\n") || safeValue.includes("\r")) {
                return `"${safeValue.replace(/"/g, '""')}"`;
            }
            return safeValue;
        };
        const headers = ["Role ID", "Role Name", "Role Key", "Description", "Active", "System Role", "Permission Count", "Permission Names", "Permission Keys", "Permission Modules", "Created At", "Updated At"];
        const rows = orderedRoles.map((role) => {
            const permissions = Array.isArray(role.permissions) ? role.permissions : [];
            const permissionNames = permissions.map((permission) => permission.name).filter(Boolean).join(" | ");
            const permissionKeys = permissions.map((permission) => permission.key).filter(Boolean).join(" | ");
            const permissionModules = [...new Set(permissions.map((permission) => permission.module).filter(Boolean))].join(" | ");
            return [role._id, role.name, role.key, role.description ?? "", role.isActive, role.isSystem, permissions.length, permissionNames, permissionKeys, permissionModules, role.createdAt ? new Date(role.createdAt).toISOString() : "", role.updatedAt ? new Date(role.updatedAt).toISOString() : ""];
        });
        // BOM helps Microsoft Excel correctly recognize UTF-8 CSV files.
        const csv = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
        return { csv, total: orderedRoles.length };
    }
}
//# sourceMappingURL=rbac.service.js.map