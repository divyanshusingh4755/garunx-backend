export var Role;
(function (Role) {
    Role["ADMIN"] = "ADMIN";
    Role["COORDINATOR"] = "COORDINATOR";
    Role["USER"] = "USER";
})(Role || (Role = {}));
export var Permission;
(function (Permission) {
    Permission["FAMILY_TREE_READ_SELF"] = "family_tree:read_self";
    Permission["FAMILY_TREE_CREATE_SELF"] = "family_tree:create_self";
    Permission["FAMILY_TREE_UPDATE_SELF"] = "family_tree:update_self";
    Permission["FAMILY_TREE_DELETE_SELF"] = "family_tree:delete_self";
    Permission["FAMILY_TREE_READ_ANY"] = "family_tree:read_any";
    Permission["FAMILY_TREE_CREATE_ANY"] = "family_tree:create_any";
    Permission["FAMILY_TREE_UPDATE_ANY"] = "family_tree:update_any";
    Permission["FAMILY_TREE_DELETE_ANY"] = "family_tree:delete_any";
})(Permission || (Permission = {}));
export const RolePermissions = {
    [Role.ADMIN]: [
        "users:read",
        "users:create",
        "users:update",
        "users:delete",
        "users:block",
        "posts:read",
        "posts:create",
        "posts:edit",
        "posts:delete",
        "posts:approve",
        "settings:read",
        "settings:update",
        "analytics:read",
        Permission.FAMILY_TREE_READ_ANY,
        Permission.FAMILY_TREE_CREATE_ANY,
        Permission.FAMILY_TREE_UPDATE_ANY,
        Permission.FAMILY_TREE_DELETE_ANY,
    ],
    [Role.COORDINATOR]: [
        "users:read",
        "posts:read",
        "posts:edit",
        "posts:delete",
        "posts:approve",
        "notifications:send",
        Permission.FAMILY_TREE_READ_ANY,
        Permission.FAMILY_TREE_CREATE_ANY,
        Permission.FAMILY_TREE_UPDATE_ANY,
        Permission.FAMILY_TREE_DELETE_ANY,
    ],
    [Role.USER]: [
        "users:read_self",
        "users:update_self",
        "posts:read",
        "posts:create",
        "posts:edit_own",
        "posts:delete_own",
        Permission.FAMILY_TREE_READ_SELF,
        Permission.FAMILY_TREE_CREATE_SELF,
        Permission.FAMILY_TREE_UPDATE_SELF,
        Permission.FAMILY_TREE_DELETE_SELF,
    ],
};
//# sourceMappingURL=rbac.js.map