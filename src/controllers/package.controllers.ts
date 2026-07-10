import type { Request, Response } from "express";
import { PackageService } from "../services/package.service.js";
import { PackageDiagnosticsEngine } from "../services/package-diagnostics-engine.service.js";

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

    const pkg = await PackageService.updatePackage(
      packageId as string,
      req.body,
    );

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

    const result = await PackageService.togglePackageStatus(
      packageId as string,
      isActive,
    );

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
    const {
      searchTerm,
      categoryId,
      locationId,
      tierId,
      limit,
      page,
      isActive,
      isComplete,
      sortBy,
      sortOrder,
    } = req.query;

    const activeBool =
      isActive === "true" ? true : isActive === "false" ? false : undefined;

    const completeBool =
      isComplete === "true" ? true : isComplete === "false" ? false : undefined;

    const {
      data,
      total,
      page: currentPage,
      totalPages,
    } = await PackageService.findPackages(
      searchTerm as string,
      categoryId as string,
      locationId as string,
      tierId as string,
      Number(limit) || 20,
      Number(page) || 1,
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
      message: error.message || "Failed to fetch packages",
    });
  }
};

export const updatePackageLocations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { locations } = req.body;

    const result = await PackageService.updatePackageLocations(
      id as string,
      locations,
    );

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

    const result = await PackageService.removePackageLocation(
      id as string,
      locationId as string,
    );

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

    const result = await PackageService.removePackageTier(
      id as string,
      tierId as string,
    );

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

export const getRelatedPackageService = async (req: Request, res: Response) => {
  try {
    const { packageId, tierId, locationId } = req.params;

    if (!packageId || !tierId || !locationId) {
      return res.status(400).json({
        success: false,
        message: "packageId, tierId, locationId is required",
      });
    }

    const data = await PackageService.getRelatedPackageService(
      packageId as string,
      tierId as string,
      locationId as string,
    );

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
    const result = await PackageDiagnosticsEngine.analyze(
      req.params.packageId as string,
    );

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

    const data = await PackageService.getFullPackageByCities(
      packageId as string,
      cityIds as string[],
    );

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
    const {
      cityIds,
      categoryIds,
      limit,
      page,
      isActive,
      isComplete,
      sortBy,
      sortOrder,
    } = req.query;

    const cityIdArray =
      typeof cityIds === "string" ? cityIds.split(",") : undefined;

    const categoryIdArray =
      typeof categoryIds === "string" ? categoryIds.split(",") : undefined;

    const activeBool =
      isActive === "true" ? true : isActive === "false" ? false : undefined;

    const completeBool =
      isComplete === "true" ? true : isComplete === "false" ? false : undefined;

    const {
      data,
      total,
      page: currentPage,
      totalPages,
    } = await PackageService.getPackagesByLocation(
      cityIdArray,
      categoryIdArray,
      Number(limit) || 20,
      Number(page) || 1,
      activeBool,
      completeBool,
      (sortBy as string) || "name",
      (sortOrder as "asc" | "desc") || "asc",
    );

    return res.status(200).json({
      success: true,
      data,
      total,
      page: currentPage,
      totalPages,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
