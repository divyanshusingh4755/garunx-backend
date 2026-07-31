import { Role, } from "../types/rbac.js";
export const mapRoleToReassignmentRole = (role) => {
    switch (role) {
        case Role.USER:
            return "USER";
        case Role.ADMIN:
            return "ADMIN";
        case Role.COORDINATOR:
            return "COORDINATOR";
    }
};
//# sourceMappingURL=mapRole.js.map