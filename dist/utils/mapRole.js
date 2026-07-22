import { Role } from "../types/rbac.js";
export const mapRoleToReassignmentRole = (role) => {
    switch (role) {
        case Role.USER:
            return "CUSTOMER";
        case Role.ADMIN:
            return "ADMIN";
        case Role.COORDINATOR:
            return "COORDINATOR";
        default:
            throw new Error("This role cannot request reassignment");
    }
};
//# sourceMappingURL=mapRole.js.map