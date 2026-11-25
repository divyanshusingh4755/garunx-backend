import type { Request, Response } from "express";
import FamilyTreeService, { type FamilyTreeActorContext, type GetFamilyMembersQuery } from "../services/family-tree.service.js";
import { FamilyRelation, Gender, MemberLifeStatus } from "../types/enums.js";
import { resolveFamilyTreeOwnerId, type ResolvedFamilyTreeAccess } from "../services/access.service.js";
import { Role } from "../types/rbac.js";
import { Types } from "mongoose";
import { User } from "../models/user.model.js";
import { FamilyMember } from "../models/family-member.model.js";
import { FamilyTreeDiscoveryService } from "../services/family-tree-discovery.service.js";
import { FamilyTreeMemberAccessService } from "../services/family-tree-member-access.service.js";

interface AuthenticatedUser { userId: string; role: string; }

const getAuthenticatedUser = (req: Request): AuthenticatedUser | null => {
  const userId = req.user?.userId;
  const role = req.user?.role;

  if (!userId || !role) { return null; }
  return { userId, role };
};

const getStringParam = (value: string | string[] | undefined, fieldName: string): string | undefined => {
  if (Array.isArray(value)) { throw new Error(`Invalid ${fieldName}`); }
  return value;
};

const getRequiredStringParam = (value: string | string[] | undefined, fieldName: string): string => {
  const parsedValue = getStringParam(value, fieldName);
  if (!parsedValue?.trim()) { throw new Error(`${fieldName} is required`); }
  return parsedValue.trim();
};

const getSourceFromRole = (role: string): FamilyTreeActorContext["source"] => {
  const normalizedRole =
    role.trim().toUpperCase();

  switch (normalizedRole) {
    case Role.USER: return "CUSTOMER_SELF"
    case Role.COORDINATOR: return "COORDINATOR_BOOKING";
    case Role.ADMIN: return "ADMIN_MANUAL";
    default: throw new Error("Role is not authorized to modify a family tree");
  }
};

const resolveTreeAccess = async (req: Request): Promise<{ authenticatedUser: AuthenticatedUser; access: ResolvedFamilyTreeAccess; }> => {
  const authenticatedUser = getAuthenticatedUser(req);

  if (!authenticatedUser) { throw new Error("Unauthorized"); }

  const requestedOwnerId = getStringParam(req.params.ownerId, "family tree owner ID");

  const access = await resolveFamilyTreeOwnerId({
    actorId: authenticatedUser.userId,
    actorRole: authenticatedUser.role,
    ...(requestedOwnerId && { requestedOwnerId }),
  });

  return { authenticatedUser, access };
};

const buildActorContext = (authenticatedUser: AuthenticatedUser, access: ResolvedFamilyTreeAccess): FamilyTreeActorContext => {
  const isSelfAccess = access.ownerId === authenticatedUser.userId;

  return {
    ownerId: access.ownerId,
    actorId: authenticatedUser.userId,
    actorRole: authenticatedUser.role,
    source: isSelfAccess ? "CUSTOMER_SELF" : getSourceFromRole(authenticatedUser.role),
    ...(access.bookingId && { bookingId: access.bookingId }),
    ...(access.bookingReference && { bookingReference: access.bookingReference }),
  };
};

const getErrorStatusCode = (error: unknown, defaultStatusCode = 400): number => {
  if (!(error instanceof Error)) { return defaultStatusCode; }

  const message = error.message.toLowerCase();
  if (message === "unauthorized") { return 401; }
  if (message.includes("not authorized") || message.includes("not assigned") || message.includes("role is not authorized")) { return 403; }
  if (message.includes("not found")) { return 404; }
  if (message.includes("invalid") || message.includes("required") || message.includes("cannot") || message.includes("do not belong") || message.includes("duplicate")) { return 400; }

  return defaultStatusCode;
};

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  return error instanceof Error ? error.message : fallbackMessage;
};

export const addFamilyMember = async (req: Request, res: Response) => {
  try {
    const { authenticatedUser, access } = await resolveTreeAccess(req);
    const context = buildActorContext(authenticatedUser, access);
    const { restoreMemberId } = req.body;

    // Restore an existing deleted member.
    if (restoreMemberId !== undefined) {
      if (typeof restoreMemberId !== "string" || !restoreMemberId.trim()) {
        throw new Error("Invalid restore member ID");
      }

      if (authenticatedUser.role !== Role.USER || context.actorId !== context.ownerId || context.source !== "CUSTOMER_SELF") {
        throw new Error("Not authorized to restore members through add-member API");
      }

      const unsupportedFields = Object.keys(req.body).filter((key) => key !== "restoreMemberId");

      if (unsupportedFields.length > 0) {
        throw new Error("Cannot combine member restoration with member creation fields");
      }

      const familyMember = await FamilyTreeService.restoreFamilyMember(context, restoreMemberId.trim(), "Restored through add-member API");

      return res.status(200).json({
        success: true,
        message: "Family member restored successfully",
        operation: "RESTORED",
        familyMember,
      });
    }

    // Existing member creation flow.
    const familyMember = await FamilyTreeService.addFamilyMember(context, req.body);

    return res.status(201).json({
      success: true,
      message: "Family member added successfully",
      operation: "CREATED",
      familyMember,
    });
  } catch (error: unknown) {
    return res.status(getErrorStatusCode(error, 400))
      .json({
        success: false,
        message: getErrorMessage(error, "Failed to add family member"),
      });
  }
};

export const getFamilyTree = async (req: Request, res: Response) => {
  try {
    const { access } = await resolveTreeAccess(req);
    const familyTree = await FamilyTreeService.getFamilyTree(access.ownerId);

    return res.status(200).json({
      success: true,
      message: familyTree.totalMembers > 0 ? "Family tree fetched successfully" : "No family members found",
      familyTree,
    });
  } catch (error: unknown) {
    return res.status(getErrorStatusCode(error, 500)).json({
      success: false,
      message: getErrorMessage(error, "Failed to fetch family tree"),
    });
  }
};

export const getFamilyMembers = async (req: Request, res: Response) => {
  try {
    const { access } = await resolveTreeAccess(req);
    const { search, relation, gender, lifeStatus, page, limit } = req.query;

    const filters: GetFamilyMembersQuery = {
      page: typeof page === "number" ? page : typeof page === "string" ? Number(page) : 1,
      limit: typeof limit === "number" ? limit : typeof limit === "string" ? Number(limit) : 20,
    };

    if (typeof search === "string") { filters.search = search.trim(); }
    if (typeof relation === "string") { filters.relation = relation as FamilyRelation; }
    if (typeof gender === "string") { filters.gender = gender as Gender; }
    if (typeof lifeStatus === "string") { filters.lifeStatus = lifeStatus as MemberLifeStatus; }

    const result = await FamilyTreeService.getFamilyMembers(access.ownerId, filters);

    return res.status(200).json({
      success: true,
      message: "Family members fetched successfully",
      ...result,
    });
  } catch (error: unknown) {
    return res.status(getErrorStatusCode(error, 500)).json({
      success: false,
      message: getErrorMessage(error, "Failed to fetch family members"),
    });
  }
};

export const getFamilyMemberById = async (req: Request, res: Response) => {
  try {
    const { access } = await resolveTreeAccess(req);
    const familyMemberId = getRequiredStringParam(req.params.id, "Family member ID");
    const familyMember = await FamilyTreeService.getFamilyMemberById(access.ownerId, familyMemberId);

    return res.status(200).json({
      success: true,
      message: "Family member fetched successfully",
      familyMember,
    });
  } catch (error: unknown) {
    return res.status(getErrorStatusCode(error, 500)).json({
      success: false,
      message: getErrorMessage(error, "Failed to fetch family member"),
    });
  }
};

export const updateFamilyMember = async (req: Request, res: Response) => {
  try {
    const { authenticatedUser, access } = await resolveTreeAccess(req);
    const familyMemberId = getRequiredStringParam(req.params.id, "Family member ID");
    const context = buildActorContext(authenticatedUser, access);
    const familyMember = await FamilyTreeService.updateFamilyMember(context, familyMemberId, req.body);

    return res.status(200).json({
      success: true,
      message: "Family member updated successfully",
      familyMember,
    });
  } catch (error: unknown) {
    return res.status(getErrorStatusCode(error, 400)).json({
      success: false,
      message: getErrorMessage(error, "Failed to update family member"),
    });
  }
};

export const deleteFamilyMember = async (req: Request, res: Response) => {
  try {
    const { authenticatedUser, access } = await resolveTreeAccess(req);
    const familyMemberId = getRequiredStringParam(req.params.id, "Family member ID");
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

    if (reason.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Deletion reason is required and must contain at least 3 characters",
      });
    }

    const context = buildActorContext(authenticatedUser, access);
    const deletedMember = await FamilyTreeService.deleteFamilyMember(context, familyMemberId, reason);

    return res.status(200).json({
      success: true,
      message: "Family member deleted successfully",
      deletedMember,
    });
  } catch (error: unknown) {
    return res.status(getErrorStatusCode(error, 400)).json({
      success: false,
      message: getErrorMessage(error, "Failed to delete family member"),
    });
  }
};

export const getFamilyTreeActivities = async (req: Request, res: Response) => {
  try {
    const { access } = await resolveTreeAccess(req);
    const { action, familyMemberId, performedBy, bookingId, page, limit } = req.query;

    const result = await FamilyTreeService.getFamilyTreeActivities(
      access.ownerId,
      {
        ...(typeof action === "string" && { action, }),
        ...(typeof familyMemberId === "string" && { familyMemberId }),
        ...(typeof performedBy === "string" && { performedBy }),
        ...(typeof bookingId === "string" && { bookingId }),
        page: typeof page === "number" ? page : typeof page === "string" ? Number(page) : 1,
        limit: typeof limit === "number" ? limit : typeof limit === "string" ? Number(limit) : 20,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Family tree activities fetched successfully",
      ...result,
    });
  } catch (error: unknown) {
    return res.status(getErrorStatusCode(error, 500)).json({
      success: false,
      message: getErrorMessage(error, "Failed to fetch family tree activities"),
    });
  }
};

export const getFamilyMemberActivities = async (req: Request, res: Response) => {
  try {
    const { access } = await resolveTreeAccess(req);
    const familyMemberId = getRequiredStringParam(req.params.id, "Family member ID");
    const { page, limit } = req.query;

    const result = await FamilyTreeService.getFamilyMemberActivities(
      access.ownerId,
      familyMemberId,
      {
        page: typeof page === "number" ? page : typeof page === "string" ? Number(page) : 1,
        limit: typeof limit === "number" ? limit : typeof limit === "string" ? Number(limit) : 20,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Family member activities fetched successfully",
      ...result,
    });
  } catch (error: unknown) {
    return res.status(getErrorStatusCode(error, 500)).json({
      success: false,
      message: getErrorMessage(error, "Failed to fetch family member activities"),
    });
  }
};

export const restoreFamilyMember = async (req: Request, res: Response) => {
  try {
    const { authenticatedUser, access } = await resolveTreeAccess(req);
    const familyMemberId = getRequiredStringParam(req.params.id, "Family member ID",);
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : undefined;
    const context = buildActorContext(authenticatedUser, access);
    const restoredMember = await FamilyTreeService.restoreFamilyMember(context, familyMemberId, reason);

    return res.status(200).json({
      success: true,
      message: "Family member restored successfully",
      restoredMember,
    });
  } catch (error: unknown) {
    return res.status(getErrorStatusCode(error, 400)).json({
      success: false,
      message: getErrorMessage(error, "Failed to restore family member"),
    });
  }
};

export const exportFamilyMembersCsv = async (req: Request, res: Response) => {
  try {
    const { access } = await resolveTreeAccess(req);
    const { memberIds }: { memberIds: string[] } = req.body;

    const result = await FamilyTreeService.exportFamilyMembersToCsv(access.ownerId, memberIds);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="family-members-${timestamp}.csv"`);

    return res.status(200).send(result.csv);
  } catch (error: unknown) {
    return res.status(getErrorStatusCode(error, 400)).json({
      success: false,
      message: getErrorMessage(error, "Failed to export family members"),
    });
  }
};

export const linkFamilyRelationship = async (req: Request, res: Response) => {
  try {
    const { authenticatedUser, access } = await resolveTreeAccess(req);
    const context = buildActorContext(authenticatedUser, access);
    const familyMemberId = req.params.id;
    if (!familyMemberId || Array.isArray(familyMemberId)) {
      throw new Error("Family member ID is required");
    }

    const familyMember = await FamilyTreeService.linkRelationship(context, familyMemberId, req.body);

    return res.status(200).json({
      success: true,
      message: "Family relationship linked successfully",
      familyMember
    })
  } catch (error: unknown) {
    return res.status(getErrorStatusCode(error, 400)).json({
      success: false,
      message: getErrorMessage(error, "Failed to link family relationship")
    })
  }
}

export const unlinkFamilyRelationship = async (req: Request, res: Response) => {
  try {
    const { authenticatedUser, access } = await resolveTreeAccess(req);
    const context = buildActorContext(authenticatedUser, access);
    const familyMemberId = req.params.id;
    const relatedMemberId = req.params.relatedMemberId;

    if (!familyMemberId || !relatedMemberId || Array.isArray(familyMemberId) || Array.isArray(relatedMemberId)) {
      throw new Error(
        "Family member IDs are required"
      );
    }

    const familyMember = await FamilyTreeService.unlinkRelationship(context, familyMemberId, relatedMemberId, req.body);

    return res.status(200).json({
      success: true,
      message: "Family relationship unlinked successfully",
      familyMember
    })
  } catch (error: unknown) {
    return res.status(getErrorStatusCode(error, 400)).json({
      success: false,
      message: getErrorMessage(error, "Failed to unlink family relationship")
    })
  }
}

export const getSharedFamilyTreeAccess = async (req: Request, res: Response) => {
  try {
    const actorId = req.user?.userId;

    if (!actorId || !Types.ObjectId.isValid(actorId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const actor = await User.findOne({
      _id: new Types.ObjectId(actorId),
      isActive: true,
      isOtpVerified: true,
    })
      .select("_id")
      .lean();

    if (!actor) {
      return res.status(403).json({
        success: false,
        message: "Verified active account required",
      });
    }

    const member = await FamilyMember.findOne({
      linkedUserId: actor._id,
      isDeleted: false,
    })
      .select("_id ownerId")
      .lean();

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "No linked family member found",
      });
    }

    return res.status(200).json({
      success: true,
      access: {
        ownerId: member.ownerId.toString(),
        linkedMemberId: member._id.toString(),
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to resolve shared family tree access",
    });
  }
};

export const getSharedFamilyTree = async (req: Request, res: Response) => {
  try {
    const actorId = req.user?.userId;
    if (!actorId || !Types.ObjectId.isValid(actorId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const actor = await User.findOne({
      _id: new Types.ObjectId(actorId),
      isActive: true,
      isOtpVerified: true,
    })
      .select("_id")
      .lean();

    if (!actor) {
      return res.status(403).json({
        success: false,
        message: "Verified active account required",
      });
    }

    const familyTree = await FamilyTreeService.getSharedFamilyTree(actorId);

    return res.status(200).json({
      success: true,
      message: "Shared family tree fetched successfully",
      familyTree,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch shared family tree";
    const status = message === "No linked family member found" ? 404
      : message === "Linked member is not in the family tree"
        ? 403 : message === "Invalid authenticated user ID"
          ? 401 : 500;

    return res.status(status).json({
      success: false,
      message,
    });
  }
};

export const updateSharedSelfMember = async (req: Request, res: Response) => {
  try {
    const actorId = req.user?.userId;
    const actorRole = req.user?.role;

    if (!actorId || !Types.ObjectId.isValid(actorId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (actorRole !== Role.USER) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const actor = await User.findOne({
      _id: new Types.ObjectId(actorId),
      isActive: true,
      isOtpVerified: true,
    })
      .select("_id")
      .lean();

    if (!actor) {
      return res.status(403).json({
        success: false,
        message: "Verified active account required",
      });
    }

    const member = await FamilyMember.findOne({
      linkedUserId: actor._id,
      isDeleted: false,
    })
      .select("_id ownerId")
      .lean();

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Linked family member not found",
      });
    }

    // Original owner continues using existing APIs.
    if (member.ownerId.toString() === actorId) {
      return res.status(403).json({
        success: false,
        message: "Use the existing family member update API",
      });
    }

    const context: FamilyTreeActorContext = {
      ownerId: member.ownerId.toString(),
      actorId,
      actorRole,
      source: "CUSTOMER_SELF",
    };

    const familyMember = await FamilyTreeService.updateFamilyMember(context, member._id.toString(), req.body);

    return res.status(200).json({
      success: true,
      message: "Family member updated successfully",
      familyMember,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update family member";
    const forbidden = message.includes("only update") || message.includes("not authorized");

    return res.status(forbidden ? 403 : 400).json({
      success: false,
      message,
    });
  }
};

export const addSharedFamilyMember = async (req: Request, res: Response) => {
  try {
    const actorId = req.user?.userId;
    const actorRole = req.user?.role;

    if (!actorId || !Types.ObjectId.isValid(actorId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (actorRole !== Role.USER) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const actor = await User.findOne({
      _id: new Types.ObjectId(actorId),
      isActive: true,
      isOtpVerified: true,
    })
      .select("_id")
      .lean();

    if (!actor) {
      return res.status(403).json({
        success: false,
        message: "Verified active account required",
      });
    }

    const linkedMember = await FamilyMember.findOne({
      linkedUserId: actor._id,
      isDeleted: false,
    })
      .select("_id ownerId")
      .lean();

    if (!linkedMember) {
      return res.status(404).json({
        success: false,
        message: "Linked family member not found",
      });
    }

    if (linkedMember.ownerId.toString() === actorId) {
      return res.status(403).json({
        success: false,
        message: "Use the existing add-member API",
      });
    }

    const context: FamilyTreeActorContext = { ownerId: linkedMember.ownerId.toString(), actorId, actorRole, source: "CUSTOMER_SELF" };

    // Do not accept a client-selected parent/related member.
    const payload = { ...req.body, relatedToMemberId: linkedMember._id.toString() };
    const familyMember = await FamilyTreeService.addFamilyMember(context, payload);

    return res.status(201).json({
      success: true,
      message: "Family member added successfully",
      familyMember,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add shared family member";
    return res.status(
      message.includes("only add") || message.includes("Joined members") || message.includes("not linked") ? 403 : 400)
      .json({
        success: false,
        message,
      });
  }
};

export const updateSharedBranchMember = async (req: Request, res: Response) => {
  try {
    const actorId = req.user?.userId;
    const actorRole = req.user?.role;
    const memberId = req.params.id;

    if (!actorId || !Types.ObjectId.isValid(actorId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (actorRole !== Role.USER) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (typeof memberId !== "string" || !Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid family member ID",
      });
    }

    const actor = await User.findOne({
      _id: new Types.ObjectId(actorId),
      isActive: true,
      isOtpVerified: true,
    })
      .select("_id")
      .lean();

    if (!actor) {
      return res.status(403).json({
        success: false,
        message: "Verified active account required",
      });
    }

    const self = await FamilyMember.findOne({
      linkedUserId: actor._id,
      isDeleted: false,
    })
      .select("_id ownerId")
      .lean();

    if (!self) {
      return res.status(403).json({
        success: false,
        message: "No linked family tree access",
      });
    }

    if (self.ownerId.toString() === actorId) {
      return res.status(403).json({
        success: false,
        message: "Use the existing family tree API",
      });
    }

    const context: FamilyTreeActorContext = {
      ownerId: self.ownerId.toString(),
      actorId,
      actorRole,
      source: "CUSTOMER_SELF",
    };

    const familyMember = await FamilyTreeService.updateFamilyMember(context, memberId, req.body);

    return res.status(200).json({
      success: true,
      message: "Family member updated successfully",
      familyMember,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update family member";
    const forbidden = message.toLowerCase().includes("not authorized");
    return res.status(forbidden ? 403 : 400).json({
      success: false,
      message,
    });
  }
};

export const deleteSharedChildMember = async (req: Request, res: Response) => {
  try {
    const actorId = req.user?.userId;
    const actorRole = req.user?.role;
    const memberId = req.params.id;
    const reason = req.body?.reason;

    if (!actorId || !Types.ObjectId.isValid(actorId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (actorRole !== Role.USER) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (typeof memberId !== "string" || !Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid family member ID",
      });
    }

    if (typeof reason !== "string" || reason.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Deletion reason is required",
      });
    }

    const actor = await User.findOne({
      _id: new Types.ObjectId(actorId),
      isActive: true,
      isOtpVerified: true,
    })
      .select("_id")
      .lean();

    if (!actor) {
      return res.status(403).json({
        success: false,
        message: "Verified active account required",
      });
    }

    const self = await FamilyMember.findOne({
      linkedUserId: actor._id,
      isDeleted: false,
    })
      .select("_id ownerId")
      .lean();

    if (!self || self.ownerId.toString() === actorId) {
      return res.status(403).json({
        success: false,
        message: "No joined family tree access",
      });
    }

    const context: FamilyTreeActorContext = {
      ownerId: self.ownerId.toString(),
      actorId,
      actorRole,
      source: "CUSTOMER_SELF",
    };

    const deletedMember = await FamilyTreeService.deleteFamilyMember(context, memberId, reason.trim());

    return res.status(200).json({
      success: true,
      message: "Family member deleted successfully",
      deletedMember,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete family member";
    const status = message.includes("Not authorized") ? 403 : message === "Family member not found" ? 404 : 400;
    return res.status(status).json({
      success: false,
      message,
    });
  }
};


export const discoverExistingFamilyTrees = async (req: Request, res: Response) => {
  try {
    const actorId = req.user?.userId;
    const actorRole = req.user?.role;

    if (!actorId || !Types.ObjectId.isValid(actorId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (actorRole !== Role.USER) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const actor = await User.findOne({
      _id: new Types.ObjectId(actorId),
      isActive: true,
      isOtpVerified: true,
    })
      .select("_id")
      .lean();

    if (!actor) {
      return res.status(403).json({
        success: false,
        message: "Verified active account required",
      });
    }

    const result = await FamilyTreeDiscoveryService.discover(
      actorId,
      {
        fatherName: req.body.fatherName,
        grandfatherName: req.body.grandfatherName,
        nativeVillage: req.body.nativeVillage,
      },
    );

    return res.status(200).json({
      success: true,
      message: result.possibleMatchFound
        ? "Possible existing family trees found"
        : "No matching family trees found",
      ...result,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error, "Failed to discover existing family trees");
    const status = message.includes("only available before") ? 409 : getErrorStatusCode(error, 500);
    return res.status(status).json({
      success: false,
      message,
    });
  }
};

export const getDeletedFamilyMembers = async (req: Request, res: Response) => {
  try {
    const { authenticatedUser, access } = await resolveTreeAccess(req);
    const context = buildActorContext(authenticatedUser, access);
    await FamilyTreeMemberAccessService.assertOwnerOnly(context);
    const { search, relation, gender, lifeStatus, page, limit } = req.query;

    const filters: GetFamilyMembersQuery = {
      page: typeof page === "number" ? page : typeof page === "string" ? Number(page) : 1,
      limit: typeof limit === "number" ? limit : typeof limit === "string" ? Number(limit) : 20,
    };

    if (typeof search === "string") {
      filters.search = search.trim();
    }

    if (typeof relation === "string") {
      filters.relation = relation as FamilyRelation;
    }

    if (typeof gender === "string") {
      filters.gender = gender as Gender;
    }

    if (typeof lifeStatus === "string") {
      filters.lifeStatus = lifeStatus as MemberLifeStatus;
    }

    const result = await FamilyTreeService.getDeletedFamilyMembers(access.ownerId, filters);
    return res.status(200).json({
      success: true,
      message: "Deleted family members fetched successfully",
      ...result,
    });
  } catch (error: unknown) {
    return res.status(getErrorStatusCode(error, 500))
      .json({
        success: false,
        message: getErrorMessage(error, "Failed to fetch deleted family members"),
      });
  }
};
