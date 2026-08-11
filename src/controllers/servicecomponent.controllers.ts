import type { Request, Response } from "express";
import { ServiceComponentService } from "../services/servicecomponent.service.js";

const getStatusCode = (error: any): number => {
  if (typeof error?.statusCode === "number") {
    return error.statusCode;
  }

  if (error?.name === "ValidationError") {
    return 400;
  }

  if (error?.code === 11000) {
    return 409;
  }

  return 500;
};

export const bulkUpsertServiceComponents = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await ServiceComponentService.bulkUpsertComponents(req.body);

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to assign service components",
    });
  }
};

export const replaceServiceComponents = async (req: Request, res: Response) => {
  try {
    const result = await ServiceComponentService.replaceComponents(req.body);

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to replace service components",
    });
  }
};

export const getComponentsByServiceAndTier = async (
  req: Request,
  res: Response,
) => {
  try {
    const data = await ServiceComponentService.getComponentsByServiceAndTier(
      req.params.serviceId as string,
      req.params.tierId as string,
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to fetch service components",
    });
  }
};

export const updateServiceComponent = async (req: Request, res: Response) => {
  try {
    const result = await ServiceComponentService.patchComponent(req.body);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to update service component",
    });
  }
};
