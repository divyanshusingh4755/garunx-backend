export declare enum Role {
    ADMIN = "ADMIN",
    COORDINATOR = "COORDINATOR",
    USER = "USER"
}
export declare enum Permission {
    FAMILY_TREE_READ_SELF = "family_tree:read_self",
    FAMILY_TREE_CREATE_SELF = "family_tree:create_self",
    FAMILY_TREE_UPDATE_SELF = "family_tree:update_self",
    FAMILY_TREE_DELETE_SELF = "family_tree:delete_self",
    FAMILY_TREE_READ_ANY = "family_tree:read_any",
    FAMILY_TREE_CREATE_ANY = "family_tree:create_any",
    FAMILY_TREE_UPDATE_ANY = "family_tree:update_any",
    FAMILY_TREE_DELETE_ANY = "family_tree:delete_any"
}
export declare const RolePermissions: Record<Role, string[]>;
//# sourceMappingURL=rbac.d.ts.map