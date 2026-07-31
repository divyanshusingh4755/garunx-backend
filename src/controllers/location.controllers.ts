import type { Request, Response } from "express";
import { LocationService } from "../services/location.service.js";

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

export const createLocation = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      name,
      country,
      stateId,
      cityId,
      fullAddress,
      pincode,
      image,
      description,
      location,
    } = req.body;

    const result = await LocationService.createLocation({
      name,
      country,
      stateId,
      cityId,
      fullAddress,
      pincode,
      image,
      description,
      location,
    });

    return res.status(201).json({
      success: true,
      message: "Location created successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to create location",
    });
  }
};

export const updateLocation = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;

    const result = await LocationService.updateLocation(
      id as string,
      req.body,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to update location",
    });
  }
};

export const getAllLocation = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      searchTerm,
      countryFilter,
      stateIdFilter,
      cityIdFilter,
      pincodeFilter,
      limit,
      page,
      isActive,
      sortBy,
      sortOrder,
    } = req.query;

    const activeStatus =
      isActive === "true"
        ? true
        : isActive === "false"
          ? false
          : undefined;

    const result = await LocationService.findLocation({
      limit: limit ? Number(limit) : 40,
      page: page ? Number(page) : 1,

      sortBy:
        typeof sortBy === "string"
          ? sortBy
          : "createdAt",

      sortOrder:
        sortOrder === "asc" || sortOrder === "desc"
          ? sortOrder
          : "desc",

      ...(typeof searchTerm === "string" && {
        searchTerm,
      }),

      ...(typeof countryFilter === "string" && {
        countryFilter,
      }),

      ...(typeof stateIdFilter === "string" && {
        stateIdFilter,
      }),

      ...(typeof cityIdFilter === "string" && {
        cityIdFilter,
      }),

      ...(typeof pincodeFilter === "string" && {
        pincodeFilter,
      }),

      ...(typeof activeStatus === "boolean" && {
        isActive: activeStatus,
      }),
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message:
        error.message || "Failed to fetch locations",
    });
  }
};

export const getLocationById = async (
  req: Request,
  res: Response,
) => {
  try {
    const location =
      await LocationService.getLocationById(
        req.params.id as string,
      );

    return res.status(200).json({
      success: true,
      data: location,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to get location",
    });
  }
};

export const deleteLocation = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { status, confirmed = false } = req.body;

    const result =
      await LocationService.softDeleteLocation(
        id as string,
        status,
        confirmed,
      );

    if (result.requiresConfirmation) {
      return res.status(200).json({
        success: true,
        requiresConfirmation: true,
        message:
          "This location is linked with services/packages. Please confirm.",
        data: result,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Location ${status ? "activated" : "deactivated"
        } successfully`,
      data: result,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message:
        error.message || "Failed to change location status",
    });
  }
};

export const getLocationIds = async (
  req: Request,
  res: Response,
) => {
  try {
    const { locationIds } = req.body as {
      locationIds: string[];
    };

    const locations =
      await LocationService.getLocationByIds(locationIds);

    return res.status(200).json({
      success: true,
      data: locations,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message:
        error.message || "Failed to get locations",
    });
  }
};
