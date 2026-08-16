import type {
  Request,
  Response,
} from "express";

import {
  PackageTierPricingService,
} from "../services/packagetierpricing.service.js";

import {
  HttpError,
} from "../utils/httpError.js";


const getStatusCode = (
  error: unknown,
): number => {
  if (
    error instanceof
    HttpError
  ) {
    return error.statusCode;
  }

  if (
    typeof error ===
    "object" &&
    error !== null &&
    "name" in error &&
    (
      error as {
        name?: unknown;
      }
    ).name ===
    "ValidationError"
  ) {
    return 400;
  }

  if (
    typeof error ===
    "object" &&
    error !== null &&
    "code" in error &&
    (
      error as {
        code?: unknown;
      }
    ).code ===
    11000
  ) {
    return 409;
  }

  return 500;
};


const getErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  return error instanceof Error
    ? error.message
    : fallback;
};


export const bulkUpsertPackageTierPricing =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const result =
        await PackageTierPricingService
          .bulkUpsertTierPricing(
            req.body,
          );

      return res
        .status(200)
        .json(
          result,
        );
    } catch (
    error: unknown
    ) {
      return res
        .status(
          getStatusCode(
            error,
          ),
        )
        .json({
          success:
            false,

          message:
            getErrorMessage(
              error,
              "Failed to update package tier pricing",
            ),
        });
    }
  };


export const resolvePackagePricing =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const {
        packageId,
        tierId,
        locationId,
      } =
        req.query;

      const data =
        await PackageTierPricingService
          .resolvePricing(
            packageId as string,
            tierId as string,
            locationId as string,
          );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (
    error: unknown
    ) {
      return res
        .status(
          getStatusCode(
            error,
          ),
        )
        .json({
          success:
            false,

          message:
            getErrorMessage(
              error,
              "Failed to resolve package pricing",
            ),
        });
    }
  };