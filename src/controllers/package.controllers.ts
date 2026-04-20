import type { Request, Response } from "express";
import { PackageService } from "../services/package.service.js";

export const createPackage = async (req: Request, res: Response) => {
  try {
    const pkg = await PackageService.createPackage(req.body);

    res.status(201).json({
      success: true,
      data: pkg,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create package",
    });
  }
};

export const updatePackage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pkg = await PackageService.updatePackage(id as string, req.body);

    res.status(200).json({
      success: true,
      data: pkg,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update package",
    });
  }
};

export const getPackageDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { location } = req.query;

    const pkg = await PackageService.getPackageDetails(
      id as string,
      location as string,
    );

    res.status(200).json({
      success: true,
      data: pkg,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch package details",
    });
  }
};

export const getPackageById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pkg = await PackageService.getPackageById(id as string);

    res.status(200).json({
      success: true,
      data: pkg,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || "Package not found",
    });
  }
};

export const getFullPackageDetails = async (req: Request, res: Response) => {
  try {
    const { serviceIds } = req.body;

    if (!Array.isArray(serviceIds)) {
      return res
        .status(400)
        .json({ success: false, message: "serviceIds must be an array" });
    }

    const pkg = await PackageService.getFullPackageDetails(serviceIds);

    res.status(200).json({
      success: true,
      data: pkg,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || "Package not found",
    });
  }
};

export const updatePackageStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const result = await PackageService.updatePackageStatus(
      id as string,
      isActive,
    );

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update package status",
    });
  }
};

export const getPackages = async (req: Request, res: Response) => {
  try {
    const {
      page,
      limit,
      isActive,
      search,
      category,
      serviceId,
      location,
      sortBy,
      sortOrder,
    } = req.query;

    const activeBool =
      isActive === "true" ? true : isActive === "false" ? false : undefined;

    const result = await PackageService.getPackages({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      isActive: activeBool, // Pass undefined, true, or false
      search: search as string,
      category: category as string,
      serviceId: serviceId as string,
      location: location as string,
      sortBy: (sortBy as string) || "displayOrder",
      sortOrder: (sortOrder as "asc" | "desc") || "asc",
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch packages",
    });
  }
};
