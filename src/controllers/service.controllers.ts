import type { Request, Response } from "express";
import { ServiceService } from "../services/service.service.js";

export const createService = async (req: Request, res: Response) => {
  try {
    const service = await ServiceService.createService(req.body);

    res.status(201).json({
      success: true,
      data: service,
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
        message: "Service with this reference already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Interal server error",
    });
  }
};

export const updateService = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;

    const service = await ServiceService.updateService(
      serviceId as string,
      req.body,
    );

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const toggleServiceStatus = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const { isActive } = req.body;

    const result = await ServiceService.toggleServiceStatus(
      serviceId as string,
      isActive,
    );

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getServiceById = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;

    const service = await ServiceService.getServiceById(serviceId as string);

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllServices = async (req: Request, res: Response) => {
  try {
    const {
      searchTerm,
      categoryId,
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
      page: CurrentPage,
      totalPages,
    } = await ServiceService.FindServices(
      searchTerm as string,
      categoryId as string,
      Number(limit) || 20,
      Number(page) || 1,
      activeBool,
      completeBool,
      (sortBy as string) || "name",
      (sortOrder as "asc" | "desc") || "asc",
    );

    res.status(200).json({
      success: true,
      data,
      total,
      CurrentPage,
      totalPages,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch services",
    });
  }
};

export const updateServiceLocations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { locations } = req.body;
    const result = await ServiceService.updateServiceLocations(
      id as string,
      locations,
    );
    res.status(200).json(result);
  } catch (error: any) {
    if (error.message === "Service not found") {
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

export const removeServiceLocation = async (req: Request, res: Response) => {
  try {
    const { id, locationId } = req.params;
    const result = await ServiceService.removeServiceLocation(
      id as string,
      locationId as string,
    );
    res.status(200).json(result);
  } catch (error: any) {
    if (error.message === "Service not found") {
      return res.status(400).json({
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

export const updateServiceTiers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tiers } = req.body;

    const result = await ServiceService.updateServiceTiers(id as string, tiers);
    res.status(200).json(result);
  } catch (error: any) {
    if (error.message === "Service not found") {
      return res.status(404).json({
        sucess: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const removeServiceTier = async (req: Request, res: Response) => {
  try {
    const { id, tierId } = req.params;

    const result = await ServiceService.removeServiceTier(
      id as string,
      tierId as string,
    );

    return res.status(200).json(result);
  } catch (error: any) {
    if (error.message === "Service not found") {
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

export const getFullService = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;

    const data = await ServiceService.getFullService(serviceId as string);

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

export const getRuntimeServices = async (req: Request, res: Response) => {
  try {
    const {
      categoryId,
      locationId,
      searchTerm,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const result = await ServiceService.getRuntimeServices({
      categoryId,
      locationId,
      searchTerm,
      page: pageNum,
      limit: limitNum,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      pagination: {
        total: result.total,
        page: result.page,
        limit: limitNum,
        totalPages: result.totalPages,
      },
      data: result.services,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
