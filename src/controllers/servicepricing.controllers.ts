import { ServicePricingService } from "../services/servicepricing.service.js";
import type { Request, Response } from "express";

export const bulkUpsertTierPricing = async (req: Request, res: Response) => {
  try {
    const result = await ServicePricingService.bulkUpsertTierPricing(req.body);

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const resolvePricing = async (req: Request, res: Response) => {
  try {
    const { serviceId, tierId, locationId } = req.query;

    const data = await ServicePricingService.resolvePricing(
      serviceId as string,
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
