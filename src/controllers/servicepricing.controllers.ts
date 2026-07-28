import type {
  Request,
  Response,
} from "express";

import {
  ServicePricingService,
} from "../services/servicepricing.service.js";

function getErrorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred";
}

export const bulkUpsertTierPricing =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const result =
        await ServicePricingService
          .bulkUpsertTierPricing(
            req.body,
          );

      return res
        .status(200)
        .json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        success: false,
        message:
          getErrorMessage(error),
      });
    }
  };

export const resolvePricing =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const {
        serviceId,
        tierId,
        locationId,
      } = req.query;

      const data =
        await ServicePricingService
          .resolvePricing(
            String(serviceId),
            String(tierId),
            String(locationId),
          );

      return res
        .status(200)
        .json({
          success: true,
          data,
        });
    } catch (error: unknown) {
      return res.status(400).json({
        success: false,
        message:
          getErrorMessage(error),
      });
    }
  };