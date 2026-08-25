import type { Request, Response } from "express";
import { PackageService } from "../services/package.service.js";
import { PackageDiagnosticsEngine } from "../services/package-diagnostics-engine.service.js";

const parsePositiveInteger = (value: unknown, defaultValue: number, maximum?: number,) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) { return defaultValue; }
  return maximum ? Math.min(parsed, maximum) : parsed;
};

const parseIdList = (value: unknown): string[] | undefined => {
  if (typeof value !== "string") { return undefined; }
  const ids = value.split(",").map((id) => id.trim()).filter(Boolean);
  return ids.length ? ids : undefined;
};

export const createPackage = async (req: Request, res: Response) => {
  try {
    const pkg = await PackageService.createPackage(req.body);

    return res.status(201).json({
      success: true,
      data: pkg,
    });
  } catch (error: any) {
    if (error.name === "ValidationError" || error.isOperational) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Package with this reference already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updatePackage = async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;

    const pkg = await PackageService.updatePackage(packageId as string, req.body);

    return res.status(200).json({
      success: true,
      data: pkg,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const togglePackageStatus = async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;
    const { isActive } = req.body;

    const result = await PackageService.togglePackageStatus(packageId as string, isActive);

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPackageById = async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;

    const pkg = await PackageService.getPackageById(packageId as string);

    return res.status(200).json({
      success: true,
      data: pkg,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllPackages = async (req: Request, res: Response) => {
  try {
    const { searchTerm, categoryId, locationId, tierId, limit, page, sortBy, sortOrder } = req.query;
    const parsedLimit = parsePositiveInteger(limit, 20, 100);
    const parsedPage = parsePositiveInteger(page, 1);

    const { data, total, page: currentPage, totalPages } = await PackageService.findPackages(
      searchTerm as string,
      categoryId as string,
      locationId as string,
      tierId as string,
      parsedLimit,
      parsedPage,

      true, // isActive
      true, // isComplete

      (sortBy as string) || "name",
      (sortOrder as "asc" | "desc") || "asc",
    );

    return res.status(200).json({
      success: true,
      data,
      total,
      currentPage,
      totalPages,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch packages",
    });
  }
};

export const getAllPackagesAdmin = async (req: Request, res: Response) => {
  try {
    const { searchTerm, categoryId, locationId, tierId, limit, page, isActive, isComplete, sortBy, sortOrder } = req.query;
    const activeBool = isActive === "true" ? true : isActive === "false" ? false : undefined;
    const completeBool = isComplete === "true" ? true : isComplete === "false" ? false : undefined;
    const parsedLimit = parsePositiveInteger(limit, 20, 100);
    const parsedPage = parsePositiveInteger(page, 1);

    const { data, total, page: currentPage, totalPages } = await PackageService.findPackages(
      searchTerm as string,
      categoryId as string,
      locationId as string,
      tierId as string,
      parsedLimit,
      parsedPage,
      activeBool,
      completeBool,
      (sortBy as string) || "name",
      (sortOrder as "asc" | "desc") || "asc",
    );

    return res.status(200).json({
      success: true,
      data,
      total,
      currentPage,
      totalPages,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch packages",
    });
  }
};

export const updatePackageLocations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { locations } = req.body;

    const result = await PackageService.updatePackageLocations(id as string, locations);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error.message === "Package not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const removePackageLocation = async (req: Request, res: Response) => {
  try {
    const { id, locationId } = req.params;

    const result = await PackageService.removePackageLocation(id as string, locationId as string);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error.message === "Package not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updatePackageTiers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tiers } = req.body;

    const result = await PackageService.updatePackageTiers(id as string, tiers);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error.message === "Package not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const removePackageTier = async (req: Request, res: Response) => {
  try {
    const { id, tierId } = req.params;

    const result = await PackageService.removePackageTier(id as string, tierId as string);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error.message === "Package not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getFullPackage = async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;

    const data = await PackageService.getFullPackage(packageId as string);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getFullPackageAdmin = async (req: Request, res: Response) => {
  try {
    const data = await PackageService.getFullPackageAdmin(req.params.packageId as string);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(typeof error?.statusCode === "number" ? error.statusCode : 500).json({
      success: false,
      message: error.message || "Failed to fetch package",
    });
  }
};

export const getRelatedPackageService = async (req: Request, res: Response) => {
  try {
    const { packageId, tierId, locationId } = req.params;

    const data = await PackageService.getRelatedPackageService(packageId as string, tierId as string, locationId as string);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPackageDiagnostics = async (req: Request, res: Response) => {
  try {
    const result = await PackageDiagnosticsEngine.analyze(req.params.packageId as string);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getFullPackageByCities = async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;
    const { cityIds } = req.body;

    if (!Array.isArray(cityIds) || cityIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "cityIds must be a non-empty array",
      });
    }

    const data = await PackageService.getFullPackageByCities(packageId as string, cityIds as string[]);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPackagesByLocation = async (req: Request, res: Response) => {
  try {
    const { cityIds, categoryIds, limit, page, sortBy, sortOrder } = req.query;
    const cityIdArray = parseIdList(cityIds);
    const categoryIdArray = parseIdList(categoryIds);
    const parsedLimit = parsePositiveInteger(limit, 20, 100);
    const parsedPage = parsePositiveInteger(page, 1);

    const { data, total, page: currentPage, totalPages } = await PackageService.getPackagesByLocation(
      cityIdArray,
      categoryIdArray,
      parsedLimit,
      parsedPage,

      // USER endpoint: never allow caller to request hidden packages.
      true,
      true,

      (sortBy as string) || "name",
      (sortOrder as | "asc" | "desc") || "asc",
    );

    return res.status(200).json({
      success: true,
      data,
      total,
      page: currentPage,
      totalPages,
    });
  } catch (error: any) {
    return res.status(typeof error?.statusCode === "number" ? error.statusCode : 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const exportPackagesToCsv = async (req: Request, res: Response) => {
  try {
    const { packageIds } = req.body as { packageIds: string[] };
    const { csv, total } = await PackageService.exportPackagesToCsv(packageIds);
    const fileName = `packages-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("X-Export-Count", String(total));

    return res.status(200).send(`\uFEFF${csv}`);
  } catch (error: any) {
    const status = typeof error?.statusCode === "number" ? error.statusCode : error?.message === "No packages found for export" ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to export packages",
    });
  }
};