import type { Request, Response } from "express";
import { ServiceService } from "../services/service.service.js";
import { ServiceDiagnosticsEngine } from "../services/diagnostic-engine.service.js";

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

export const createService = async (req: Request, res: Response) => {
  try {
    const {
      name,
      shortDescription,
      fullDescription,
      categoryId,
      thumbnailImage,
      bannerImage,
    } = req.body;

    const service = await ServiceService.createService({
      name,
      shortDescription,
      fullDescription,
      categoryId,
      thumbnailImage,

      ...(bannerImage !== undefined && {
        bannerImage,
      }),
    });

    return res.status(201).json({
      success: true,
      data: service,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updateService = async (req: Request, res: Response) => {
  try {
    const service = await ServiceService.updateService(
      req.params.serviceId as string,
      req.body,
    );

    return res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to update service",
    });
  }
};

export const toggleServiceStatus = async (req: Request, res: Response) => {
  try {
    const { isActive, confirmed = false } = req.body;

    const result = await ServiceService.toggleServiceStatus(
      req.params.serviceId as string,
      isActive,
      confirmed,
    );

    if (result.requiresConfirmation) {
      return res.status(200).json({
        success: true,
        requiresConfirmation: true,
        message:
          "This service is linked with packages or pricing. Please confirm.",
        data: result,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Service ${isActive ? "activated" : "deactivated"} successfully`,
      data: result,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to update service status",
    });
  }
};

export const getServiceById = async (req: Request, res: Response) => {
  try {
    const service = await ServiceService.getServiceById(
      req.params.serviceId as string,
    );

    return res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to get service",
    });
  }
};

export const getServicesByLocation = async (req: Request, res: Response) => {
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
      typeof cityIds === "string"
        ? cityIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
        : undefined;

    const categoryIdArray =
      typeof categoryIds === "string"
        ? categoryIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
        : undefined;

    const activeStatus =
      isActive === "true" ? true : isActive === "false" ? false : undefined;

    const completeStatus =
      isComplete === "true" ? true : isComplete === "false" ? false : undefined;

    const result = await ServiceService.getServicesByLocation({
      limit: limit ? Number(limit) : 20,
      page: page ? Number(page) : 1,

      sortBy: typeof sortBy === "string" ? sortBy : "name",

      sortOrder:
        sortOrder === "asc" || sortOrder === "desc" ? sortOrder : "asc",

      ...(cityIdArray !== undefined && {
        cityIds: cityIdArray,
      }),

      ...(categoryIdArray !== undefined && {
        categoryIds: categoryIdArray,
      }),

      ...(activeStatus !== undefined && {
        isActive: activeStatus,
      }),

      ...(completeStatus !== undefined && {
        isComplete: completeStatus,
      }),
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to fetch services by location",
    });
  }
};

export const getAllServices = async (req: Request, res: Response) => {
  try {
    const {
      searchTerm,
      categoryId,
      locationId,
      limit,
      page,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await ServiceService.findServices({
      limit: limit ? Number(limit) : 20,
      page: page ? Number(page) : 1,

      isActive: true,
      isComplete: true,

      sortBy:
        typeof sortBy === "string"
          ? sortBy
          : "name",

      sortOrder:
        sortOrder === "asc" ||
          sortOrder === "desc"
          ? sortOrder
          : "asc",

      ...(typeof searchTerm === "string" && {
        searchTerm,
      }),

      ...(typeof categoryId === "string" && {
        categoryId,
      }),

      ...(typeof locationId === "string" && {
        locationId,
      }),
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      currentPage: result.page,
      totalPages: result.totalPages,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to fetch services",
    });
  }
};

export const getAllServicesAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      searchTerm,
      categoryId,
      locationId,
      limit,
      page,
      isActive,
      isComplete,
      sortBy,
      sortOrder,
    } = req.query;

    const activeStatus =
      isActive === "true"
        ? true
        : isActive === "false"
          ? false
          : undefined;

    const completeStatus =
      isComplete === "true"
        ? true
        : isComplete === "false"
          ? false
          : undefined;

    const result =
      await ServiceService.findServices({
        limit: limit ? Number(limit) : 20,
        page: page ? Number(page) : 1,

        sortBy:
          typeof sortBy === "string"
            ? sortBy
            : "name",

        sortOrder:
          sortOrder === "asc" ||
            sortOrder === "desc"
            ? sortOrder
            : "asc",

        ...(typeof searchTerm === "string" && {
          searchTerm,
        }),

        ...(typeof categoryId === "string" && {
          categoryId,
        }),

        ...(typeof locationId === "string" && {
          locationId,
        }),

        ...(activeStatus !== undefined && {
          isActive: activeStatus,
        }),

        ...(completeStatus !== undefined && {
          isComplete: completeStatus,
        }),
      });

    return res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      currentPage: result.page,
      totalPages: result.totalPages,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch services",
    });
  }
};

export const updateServiceLocations = async (req: Request, res: Response) => {
  try {
    const result = await ServiceService.updateServiceLocations(
      req.params.id as string,
      req.body.locations,
    );

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to update service locations",
    });
  }
};

export const removeServiceLocation = async (req: Request, res: Response) => {
  try {
    const result = await ServiceService.removeServiceLocation(
      req.params.id as string,
      req.params.locationId as string,
    );

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to remove service location",
    });
  }
};

export const updateServiceTiers = async (req: Request, res: Response) => {
  try {
    const result = await ServiceService.updateServiceTiers(
      req.params.id as string,
      req.body.tiers,
    );

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to update service tiers",
    });
  }
};

export const removeServiceTier = async (req: Request, res: Response) => {
  try {
    const result = await ServiceService.removeServiceTier(
      req.params.id as string,
      req.params.tierId as string,
    );

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to remove service tier",
    });
  }
};

export const getFullService = async (req: Request, res: Response) => {
  try {
    const data = await ServiceService.getFullService(
      req.params.serviceId as string,
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to get full service",
    });
  }
};

export const getFullServiceByCities = async (req: Request, res: Response) => {
  try {
    const data = await ServiceService.getFullServiceByCities(
      req.params.serviceId as string,
      req.body.cityIds,
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to get service by cities",
    });
  }
};

export const getServiceDiagnostics = async (req: Request, res: Response) => {
  try {
    const result = await ServiceDiagnosticsEngine.analyze(
      req.params.serviceId as string,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to get service diagnostics",
    });
  }
};
