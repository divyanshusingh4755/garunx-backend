export var Role;
(function (Role) {
    Role["ADMIN"] = "ADMIN";
    Role["COORDINATOR"] = "COORDINATOR";
    Role["USER"] = "USER";
})(Role || (Role = {}));
export var Permission;
(function (Permission) {
    Permission["USERS_READ"] = "users:read";
    Permission["USERS_CREATE"] = "users:create";
    Permission["USERS_UPDATE"] = "users:update";
    Permission["USERS_DELETE"] = "users:delete";
    Permission["USERS_BLOCK"] = "users:block";
    Permission["USERS_READ_SELF"] = "users:read_self";
    Permission["USERS_UPDATE_SELF"] = "users:update_self";
    Permission["POSTS_READ"] = "posts:read";
    Permission["POSTS_CREATE"] = "posts:create";
    Permission["POSTS_EDIT"] = "posts:edit";
    Permission["POSTS_DELETE"] = "posts:delete";
    Permission["POSTS_APPROVE"] = "posts:approve";
    Permission["POSTS_EDIT_OWN"] = "posts:edit_own";
    Permission["POSTS_DELETE_OWN"] = "posts:delete_own";
    Permission["SETTINGS_READ"] = "settings:read";
    Permission["SETTINGS_UPDATE"] = "settings:update";
    Permission["ANALYTICS_READ"] = "analytics:read";
    Permission["NOTIFICATIONS_SEND"] = "notifications:send";
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
        Permission.USERS_READ,
        Permission.USERS_CREATE,
        Permission.USERS_UPDATE,
        Permission.USERS_DELETE,
        Permission.USERS_BLOCK,
        Permission.POSTS_READ,
        Permission.POSTS_CREATE,
        Permission.POSTS_EDIT,
        Permission.POSTS_DELETE,
        Permission.POSTS_APPROVE,
        Permission.SETTINGS_READ,
        Permission.SETTINGS_UPDATE,
        Permission.ANALYTICS_READ,
        Permission.FAMILY_TREE_READ_ANY,
        Permission.FAMILY_TREE_CREATE_ANY,
        Permission.FAMILY_TREE_UPDATE_ANY,
        Permission.FAMILY_TREE_DELETE_ANY,
    ],
    [Role.COORDINATOR]: [
        Permission.USERS_READ,
        Permission.POSTS_READ,
        Permission.POSTS_EDIT,
        Permission.POSTS_DELETE,
        Permission.POSTS_APPROVE,
        Permission.NOTIFICATIONS_SEND,
        Permission.FAMILY_TREE_READ_ANY,
        Permission.FAMILY_TREE_CREATE_ANY,
        Permission.FAMILY_TREE_UPDATE_ANY,
        Permission.FAMILY_TREE_DELETE_ANY,
    ],
    [Role.USER]: [
        Permission.USERS_READ_SELF,
        Permission.USERS_UPDATE_SELF,
        Permission.POSTS_READ,
        Permission.POSTS_CREATE,
        Permission.POSTS_EDIT_OWN,
        Permission.POSTS_DELETE_OWN,
        Permission.FAMILY_TREE_READ_SELF,
        Permission.FAMILY_TREE_CREATE_SELF,
        Permission.FAMILY_TREE_UPDATE_SELF,
        Permission.FAMILY_TREE_DELETE_SELF,
    ],
};
//# sourceMappingURL=rbac.js.map