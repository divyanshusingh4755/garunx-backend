export var Role;
(function (Role) {
    Role["ADMIN"] = "ADMIN";
    Role["COORDINATOR"] = "COORDINATOR";
    Role["USER"] = "USER";
})(Role || (Role = {}));
export const RolePermissions = {
    [Role.ADMIN]: [
        // User Management
        'users:read', 'users:create', 'users:update', 'users:delete', 'users:block',
        // Content Management
        'posts:read', 'posts:create', 'posts:edit', 'posts:delete', 'posts:approve',
        // System Settings
        'settings:read', 'settings:update',
        // Analytics
        'analytics:read'
    ],
    [Role.COORDINATOR]: [
        // User Management (Read-only for support/coordination)
        'users:read',
        // Content Management (Full control over content flow)
        'posts:read', 'posts:edit', 'posts:delete', 'posts:approve',
        // Communications
        'notifications:send'
    ],
    [Role.USER]: [
        // Self Management
        'users:read_self', 'users:update_self',
        // Content (Ownership-based)
        'posts:read', 'posts:create', 'posts:edit_own', 'posts:delete_own'
    ]
};
//# sourceMappingURL=rbac.js.map