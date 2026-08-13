import { Types } from "mongoose";
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
export declare class RbacService {
    static createPermission(params: CreatePermissionParams): Promise<import("mongoose").Document<unknown, {}, import("../models/permission.model.js").IPermission, {}, import("mongoose").DefaultSchemaOptions> & import("../models/permission.model.js").IPermission & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getPermissions(params: GetPermissionsParams): Promise<{
        permissions: (import("../models/permission.model.js").IPermission & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    static getPermissionById(permissionId: string): Promise<import("../models/permission.model.js").IPermission & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static updatePermission(params: UpdatePermissionParams): Promise<import("mongoose").Document<unknown, {}, import("../models/permission.model.js").IPermission, {}, import("mongoose").DefaultSchemaOptions> & import("../models/permission.model.js").IPermission & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updatePermissionStatus(permissionId: string, isActive: boolean): Promise<import("mongoose").Document<unknown, {}, import("../models/permission.model.js").IPermission, {}, import("mongoose").DefaultSchemaOptions> & import("../models/permission.model.js").IPermission & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static createRole(params: CreateRoleParams): Promise<import("mongoose").Document<unknown, {}, import("../models/role.model.js").IRbacRole, {}, import("mongoose").DefaultSchemaOptions> & import("../models/role.model.js").IRbacRole & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getRoles(params: GetRolesParams): Promise<{
        roles: (import("../models/role.model.js").IRbacRole & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    static getRoleById(roleId: string): Promise<import("../models/role.model.js").IRbacRole & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static updateRole(params: UpdateRoleParams): Promise<import("mongoose").Document<unknown, {}, import("../models/role.model.js").IRbacRole, {}, import("mongoose").DefaultSchemaOptions> & import("../models/role.model.js").IRbacRole & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateRoleStatus(roleId: string, isActive: boolean): Promise<import("mongoose").Document<unknown, {}, import("../models/role.model.js").IRbacRole, {}, import("mongoose").DefaultSchemaOptions> & import("../models/role.model.js").IRbacRole & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static addRolePermissions(params: AddRolePermissionsParams): Promise<(import("../models/role.model.js").IRbacRole & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    static removeRolePermission(roleId: string, permissionId: string): Promise<(import("../models/role.model.js").IRbacRole & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    static assignRolesToUser(userId: string, roleIds: string[]): Promise<(import("../models/user.model.js").IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    static removeAllRolesFromUser(userId: string): Promise<(import("../models/user.model.js").IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    static removeRoleFromUser(userId: string, roleId: string): Promise<(import("../models/user.model.js").IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    static getUserAccess(userId: string): Promise<import("../models/user.model.js").IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
export {};
//# sourceMappingURL=rbac.service.d.ts.map