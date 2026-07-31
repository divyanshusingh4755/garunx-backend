export declare enum Role {
    ADMIN = "ADMIN",
    COORDINATOR = "COORDINATOR",
    USER = "USER"
}
export declare enum Permission {
    USERS_READ = "users:read",
    USERS_CREATE = "users:create",
    USERS_UPDATE = "users:update",
    USERS_DELETE = "users:delete",
    USERS_BLOCK = "users:block",
    USERS_READ_SELF = "users:read_self",
    USERS_UPDATE_SELF = "users:update_self",
    POSTS_READ = "posts:read",
    POSTS_CREATE = "posts:create",
    POSTS_EDIT = "posts:edit",
    POSTS_DELETE = "posts:delete",
    POSTS_APPROVE = "posts:approve",
    POSTS_EDIT_OWN = "posts:edit_own",
    POSTS_DELETE_OWN = "posts:delete_own",
    SETTINGS_READ = "settings:read",
    SETTINGS_UPDATE = "settings:update",
    ANALYTICS_READ = "analytics:read",
    NOTIFICATIONS_SEND = "notifications:send",
    FAMILY_TREE_READ_SELF = "family_tree:read_self",
    FAMILY_TREE_CREATE_SELF = "family_tree:create_self",
    FAMILY_TREE_UPDATE_SELF = "family_tree:update_self",
    FAMILY_TREE_DELETE_SELF = "family_tree:delete_self",
    FAMILY_TREE_READ_ANY = "family_tree:read_any",
    FAMILY_TREE_CREATE_ANY = "family_tree:create_any",
    FAMILY_TREE_UPDATE_ANY = "family_tree:update_any",
    FAMILY_TREE_DELETE_ANY = "family_tree:delete_any"
}
export declare const RolePermissions: Readonly<Record<Role, readonly Permission[]>>;
//# sourceMappingURL=rbac.d.ts.map