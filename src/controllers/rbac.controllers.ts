import type { Request, Response } from "express";
import { validationResult } from "express-validator";
import { RbacService } from "../services/rbac.service.js";

const isDuplicateKeyError = (error: unknown): boolean => { return (typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000); };

export const createPermission = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });

        return;
    }

    try {
        const permission = await RbacService.createPermission({ name: req.body.name, key: req.body.key, module: req.body.module, description: req.body.description });
        res.status(201).json({
            success: true,
            message: "Permission created successfully",
            data: permission,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unable to create permission";
        if (message === "Permission with this key already exists") {
            res.status(409).json({
                success: false,
                message,
            });
            return;
        }

        if (message === "Permission key module must match the module field") {
            res.status(400).json({
                success: false,
                message,
            });

            return;
        }

        res.status(500).json({
            success: false,
            message: "Unable to create permission",
        });
    }
};

export const getPermissions = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });

        return;
    }

    try {
        const module = typeof req.query.module === "string" ? req.query.module : undefined;
        const isActive = typeof req.query.isActive === "string" ? req.query.isActive === "true" : undefined;
        const page = typeof req.query.page === "string" ? Number(req.query.page) : undefined;
        const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;

        const result = await RbacService.getPermissions({
            ...(module !== undefined && { module }),
            ...(isActive !== undefined && { isActive }),
            ...(page !== undefined && { page }),
            ...(limit !== undefined && { limit }),
        });

        res.status(200).json({
            success: true,
            message: "Permissions fetched successfully",
            data: result.permissions,
            pagination: result.pagination,
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Unable to fetch permissions",
        });
    }
};

export const getPermissionById = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });

        return;
    }

    try {
        const permissionId = String(req.params.id);

        const permission = await RbacService.getPermissionById(permissionId);

        res.status(200).json({
            success: true,
            message: "Permission fetched successfully",
            data: permission,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unable to fetch permission";

        if (message === "Permission not found") {
            res.status(404).json({
                success: false,
                message,
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Unable to fetch permission",
        });
    }
};

export const updatePermission = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });
        return;
    }

    try {
        const permission = await RbacService.updatePermission({
            permissionId: String(req.params.id),
            name: req.body.name,
            key: req.body.key,
            module: req.body.module,
            description: req.body.description,
        });

        res.status(200).json({
            success: true,
            message: "Permission updated successfully",
            data: permission,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unable to update permission";
        if (message === "Permission not found") {
            res.status(404).json({
                success: false,
                message,
            });
            return;
        }

        if (message === "Permission with this key already exists" || isDuplicateKeyError(error)) {
            res.status(409).json({
                success: false,
                message: "Permission with this key already exists",
            });
            return;
        }

        if (message === "Permission key module must match the module field") {
            res.status(400).json({
                success: false,
                message,
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Unable to update permission",
        });
    }
};

export const updatePermissionStatus = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });
        return;
    }

    try {
        const permission = await RbacService.updatePermissionStatus(String(req.params.id), req.body.isActive);

        res.status(200).json({
            success: true,
            message: permission.isActive ? "Permission activated successfully" : "Permission deactivated successfully",
            data: permission,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unable to update permission status";
        if (message === "Permission not found") {
            res.status(404).json({
                success: false,
                message,
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Unable to update permission status",
        });
    }
};

export const createRole = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });
        return;
    }

    try {
        const role = await RbacService.createRole({
            name: req.body.name,
            key: req.body.key,
            description: req.body.description,
            permissions: req.body.permissions,
        });

        res.status(201).json({
            success: true,
            message: "Role created successfully",
            data: role,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unable to create role";

        if (message === "Role with this key already exists" || isDuplicateKeyError(error)) {
            res.status(409).json({
                success: false,
                message: "Role with this key already exists",
            });
            return;
        }

        if (message === "One or more permissions are invalid or inactive") {
            res.status(400).json({
                success: false,
                message,
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Unable to create role",
        });
    }
};

export const getRoles = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });

        return;
    }

    try {
        const isActive = typeof req.query.isActive === "string" ? req.query.isActive === "true" : undefined;
        const page = typeof req.query.page === "string" ? Number(req.query.page) : undefined;
        const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;

        const result = await RbacService.getRoles({
            ...(isActive !== undefined && { isActive }),
            ...(page !== undefined && { page }),
            ...(limit !== undefined && { limit }),
        });

        res.status(200).json({
            success: true,
            message: "Roles fetched successfully",
            data: result.roles,
            pagination: result.pagination,
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Unable to fetch roles",
        });
    }
};

export const getRoleById = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });
        return;
    }

    try {
        const role = await RbacService.getRoleById(String(req.params.id));

        res.status(200).json({
            success: true,
            message: "Role fetched successfully",
            data: role,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unable to fetch role";

        if (message === "Role not found") {
            res.status(404).json({
                success: false,
                message,
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Unable to fetch role",
        });
    }
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });

        return;
    }

    try {
        const role =
            await RbacService.updateRole({
                roleId: String(req.params.id),
                name: req.body.name,
                key: req.body.key,
                description: req.body.description,
            });

        res.status(200).json({
            success: true,
            message: "Role updated successfully",
            data: role,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unable to update role";

        if (message === "Role not found") {
            res.status(404).json({
                success: false,
                message,
            });
            return;
        }

        if (
            message === "Role with this key already exists" || isDuplicateKeyError(error)) {
            res.status(409).json({
                success: false,
                message: "Role with this key already exists",
            });
            return;
        }

        if (message === "System role cannot be modified"
        ) {
            res.status(400).json({
                success: false,
                message,
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Unable to update role",
        });
    }
};

export const updateRoleStatus = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });
        return;
    }

    try {
        const role = await RbacService.updateRoleStatus(String(req.params.id), req.body.isActive);

        res.status(200).json({
            success: true,
            message: role.isActive ? "Role activated successfully" : "Role deactivated successfully",
            data: role,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unable to update role status";
        if (message === "Role not found") {
            res.status(404).json({
                success: false,
                message,
            });
            return;
        }

        if (message === "System role status cannot be changed"
        ) {
            res.status(400).json({
                success: false,
                message,
            });

            return;
        }

        res.status(500).json({
            success: false,
            message: "Unable to update role status",
        });
    }
};

export const addRolePermissions = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });

        return;
    }

    try {
        const role = await RbacService.addRolePermissions({ roleId: String(req.params.id,), permissions: req.body.permissions });

        res.status(200).json({
            success: true,
            message: "Permissions added to role successfully",
            data: role,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unable to add permissions to role";
        if (message === "Role not found") {
            res.status(404).json({
                success: false,
                message,
            });

            return;
        }

        if (message === "One or more permissions are invalid or inactive" || message === "System role permissions cannot be modified"
        ) {
            res.status(400).json({
                success: false,
                message,
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Unable to add permissions to role",
        });
    }
};

export const removeRolePermission = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });
        return;
    }

    try {
        const role = await RbacService.removeRolePermission(String(req.params.id), String(req.params.permissionId));

        res.status(200).json({
            success: true,
            message: "Permission removed from role successfully",
            data: role,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unable to remove permission from role";
        if (message === "Role not found") {
            res.status(404).json({
                success: false,
                message,
            });
            return;
        }

        if (
            message === "Permission is not assigned to this role"
        ) {
            res.status(400).json({
                success: false,
                message,
            });
            return;
        }

        if (
            message === "System role permissions cannot be modified"
        ) {
            res.status(400).json({
                success: false,
                message,
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Unable to remove permission from role",
        });
    }
};

export const assignUserRoles = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });
        return;
    }

    try {
        const user = await RbacService.assignRolesToUser(String(req.params.userId), req.body.roleIds);

        res.status(200).json({
            success: true,
            message: "RBAC roles assigned to user successfully",
            data: user,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unable to assign roles";
        if (message === "User not found") {
            res.status(404).json({
                success: false,
                message,
            });
            return;
        }

        if (message === "RBAC roles can only be assigned to admin users") {
            res.status(400).json({
                success: false,
                message,
            });
            return;
        }

        if (message === "One or more roles are invalid or inactive") {
            res.status(400).json({
                success: false,
                message,
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Unable to assign RBAC roles to user",
        });
    }
};

export const removeUserRole = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });
        return;
    }

    try {
        const user = await RbacService.removeRoleFromUser(String(req.params.userId), String(req.params.roleId));

        res.status(200).json({
            success: true,
            message: "RBAC role removed from user successfully",
            data: user,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unable to remove role";

        if (message === "User not found") {
            res.status(404).json({
                success: false,
                message,
            });
            return;
        }

        if (message === "Role is not assigned to this user") {
            res.status(400).json({
                success: false,
                message,
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Unable to remove role from user",
        });
    }
};

export const removeAllUserRoles = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });
        return;
    }

    try {
        const user = await RbacService.removeAllRolesFromUser(String(req.params.userId));

        res.status(200).json({
            success: true,
            message: "All RBAC roles removed from user successfully",
            data: user,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unable to remove RBAC roles";
        if (message === "User not found") {
            res.status(404).json({
                success: false,
                message,
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Unable to remove RBAC roles from user",
        });
    }
};

export const getUserAccess = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });
        return;
    }

    try {
        const user = await RbacService.getUserAccess(String(req.params.userId));

        res.status(200).json({
            success: true,
            message: "User access fetched successfully",
            data: user,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unable to fetch user access";
        if (message === "User not found") {
            res.status(404).json({
                success: false,
                message,
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Unable to fetch user access",
        });
    }
};

export const exportRolesCsv = async (req: Request, res: Response): Promise<void> => {
    try {
        const { roleIds }: { roleIds: string[] } = req.body;

        const result = await RbacService.exportRolesToCsv(roleIds);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="rbac-roles-${timestamp}.csv"`);

        res.status(200).send(result.csv);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unable to export roles";
        if (message === "No roles found for export") {
            res.status(404).json({
                success: false,
                message,
            });

            return;
        }

        res.status(400).json({
            success: false, message: error instanceof Error ? error.message : "Unable to export roles",
        });
    }
};