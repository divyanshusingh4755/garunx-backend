import type { Request, Response } from "express";
import { PackageTierMapService } from "../services/packagetiermap.service.js";

export const bulkUpsertPackageTierMappings = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await PackageTierMapService.bulkUpsertMappings(req.body);

    return res.status(200).json(result);
  } catch (error: any) {
    console.log("error", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const replacePackageTierMappings = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await PackageTierMapService.replaceMappings(req.body);

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getServicesByPackageAndTier = async (
  req: Request,
  res: Response,
) => {
  try {
    const { packageId, tierId } = req.params;

    const data = await PackageTierMapService.getServicesByPackageAndTier(
      packageId as string,
      tierId as string,
    );

    return res.status(200).json({
      success: true,
      data,
    });
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

export const updatePackageTierService = async (req: Request, res: Response) => {
  try {
    const result = await PackageTierMapService.patchService(req.body);

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
