import type { Request, Response } from "express";
import { ServicePricingService } from "../services/servicepricing.service.js";

const getStatusCode = (error: unknown): number => {
  if (typeof error === "object" && error !== null && "statusCode" in error && typeof (error as { statusCode?: unknown; }).statusCode === "number") {
    return (error as { statusCode: number; }).statusCode;
  }

  if (typeof error === "object" && error !== null && "name" in error && (error as { name?: unknown }).name === "ValidationError") {
    return 400;
  }

  if (typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000) {
    return 409;
  }

  return 500;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "An unexpected error occurred";

export const bulkUpsertTierPricing = async (req: Request, res: Response) => {
  try {
    const result = await ServicePricingService.bulkUpsertTierPricing(req.body);

    return res.status(200).json(result);
  } catch (error: unknown) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(error),
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
  } catch (error: unknown) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};
