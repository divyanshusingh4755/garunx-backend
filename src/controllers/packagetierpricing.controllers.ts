import type { Request, Response } from "express";
import { PackageTierPricingService } from "../services/packagetierpricing.service.js";

export const bulkUpsertPackageTierPricing = async (
  req: Request,
  res: Response,
) => {
  try {
    const result =
      await PackageTierPricingService.bulkUpsertTierPricing(req.body);

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const resolvePackagePricing = async (
  req: Request,
  res: Response,
) => {
  try {
    const { packageId, tierId, locationId } = req.query;

    const data = await PackageTierPricingService.resolvePricing(
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
