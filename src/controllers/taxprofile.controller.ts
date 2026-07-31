import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  TaxProfileService,
  type TaxProfileFilters,
  type CreateTaxProfilePayload,
  type UpdateTaxProfilePayload,
} from "../services/taxprofile.service.js";
import type { TaxTreatment } from "../types/tax.types.js";

function getAuthenticatedUserId(
  req: Request,
): string | null {
  const userId = req.user?.userId;

  return userId
    ? String(userId)
    : null;
}

export class TaxProfileController {
  static async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const adminId =
        getAuthenticatedUserId(req);

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const payload:
        CreateTaxProfilePayload = {
          name: req.body.name,
          code: req.body.code,
          treatment:
            req.body.treatment,
          totalRate:
            req.body.totalRate,
          createdBy: adminId,
        };

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "description",
        )
      ) {
        payload.description =
          req.body.description;
      }

      const taxProfile =
        await TaxProfileService
          .createTaxProfile(payload);

      return res.status(201).json({
        success: true,
        message:
          "Tax profile created successfully",
        data: taxProfile,
      });
    } catch (error: unknown) {
      return next(error);
    }
  }

  static async list(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const filters:
        TaxProfileFilters = {};

      if (
        typeof req.query.search ===
        "string"
      ) {
        filters.search =
          req.query.search;
      }

      if (
        typeof req.query.treatment ===
        "string"
      ) {
        filters.treatment =
          req.query.treatment as
            TaxTreatment;
      }

      if (
        req.query.isActive === "true"
      ) {
        filters.isActive = true;
      } else if (
        req.query.isActive === "false"
      ) {
        filters.isActive = false;
      }

      const page =
        typeof req.query.page ===
        "number"
          ? req.query.page
          : Number(req.query.page);

      if (
        Number.isInteger(page) &&
        page > 0
      ) {
        filters.page = page;
      }

      const limit =
        typeof req.query.limit ===
        "number"
          ? req.query.limit
          : Number(req.query.limit);

      if (
        Number.isInteger(limit) &&
        limit > 0
      ) {
        filters.limit =
          Math.min(limit, 100);
      }

      const result =
        await TaxProfileService
          .getTaxProfiles(filters);

      return res.status(200).json({
        success: true,
        message:
          "Tax profiles fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      return next(error);
    }
  }

  static async listActive(
    _req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const taxProfiles =
        await TaxProfileService
          .getActiveTaxProfiles();

      return res.status(200).json({
        success: true,
        message:
          "Active tax profiles fetched successfully",
        data: taxProfiles,
      });
    } catch (error: unknown) {
      return next(error);
    }
  }

  static async getById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const taxProfile =
        await TaxProfileService
          .getTaxProfileById(
            req.params
              .taxProfileId as string,
          );

      return res.status(200).json({
        success: true,
        data: taxProfile,
      });
    } catch (error: unknown) {
      return next(error);
    }
  }

  static async update(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const adminId =
        getAuthenticatedUserId(req);

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const payload:
        UpdateTaxProfilePayload = {
          updatedBy: adminId,
        };

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "name",
        )
      ) {
        payload.name = req.body.name;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "treatment",
        )
      ) {
        payload.treatment =
          req.body.treatment;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "totalRate",
        )
      ) {
        payload.totalRate =
          req.body.totalRate;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "description",
        )
      ) {
        payload.description =
          req.body.description;
      }

      const taxProfile =
        await TaxProfileService
          .updateTaxProfile(
            req.params
              .taxProfileId as string,
            payload,
          );

      return res.status(200).json({
        success: true,
        message:
          "Tax profile updated successfully",
        data: taxProfile,
      });
    } catch (error: unknown) {
      return next(error);
    }
  }

  static async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const adminId =
        getAuthenticatedUserId(req);

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const taxProfile =
        await TaxProfileService
          .updateTaxProfileStatus(
            req.params
              .taxProfileId as string,
            req.body.isActive,
            adminId,
          );

      return res.status(200).json({
        success: true,
        message: req.body.isActive
          ? "Tax profile activated successfully"
          : "Tax profile deactivated successfully",
        data: taxProfile,
      });
    } catch (error: unknown) {
      return next(error);
    }
  }
}
