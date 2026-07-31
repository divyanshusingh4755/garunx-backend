import {
  Role,
} from "../types/rbac.js";

import type {
  ReassignmentRequestedByRole,
} from "../models/booking.model.js";

export const mapRoleToReassignmentRole = (
  role: Role,
): ReassignmentRequestedByRole => {
  switch (role) {
    case Role.USER:
      return "USER";

    case Role.ADMIN:
      return "ADMIN";

    case Role.COORDINATOR:
      return "COORDINATOR";
  }
};