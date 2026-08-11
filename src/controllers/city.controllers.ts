import type { Request, Response } from "express";
import { CityService } from "../services/city.service.js";

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

export const createCity = async (req: Request, res: Response) => {
  try {
    const { name, country, stateId, image, description, location } = req.body;

    const city = await CityService.createCity({
      name,
      country,
      stateId,
      image,
      description,
      location,
    });

    return res.status(201).json({
      success: true,
      message: "City created successfully",
      data: city,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to create city",
    });
  }
};

export const updateCity = async (req: Request, res: Response) => {
  try {
    const city = await CityService.updateCity(
      req.params.id as string,
      req.body,
    );

    return res.status(200).json({
      success: true,
      data: city,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to update city",
    });
  }
};

export const getAllCity = async (req: Request, res: Response) => {
  try {
    const {
      searchTerm,
      cityFilter,
      stateIdFilter,
      countryFilter,
      limit,
      page,
      isActive,
      sortBy,
      sortOrder,
    } = req.query;

    const activeStatus =
      isActive === "true" ? true : isActive === "false" ? false : undefined;

    const result = await CityService.findCity({
      limit: limit ? Number(limit) : 40,
      page: page ? Number(page) : 1,

      sortBy: typeof sortBy === "string" ? sortBy : "createdAt",

      sortOrder:
        sortOrder === "asc" || sortOrder === "desc" ? sortOrder : "desc",

      ...(typeof searchTerm === "string" && {
        searchTerm,
      }),

      ...(typeof cityFilter === "string" && {
        cityFilter,
      }),

      ...(typeof stateIdFilter === "string" && {
        stateIdFilter,
      }),

      ...(typeof countryFilter === "string" && {
        countryFilter,
      }),

      ...(typeof activeStatus === "boolean" && {
        isActive: activeStatus,
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
      message: error.message || "Failed to fetch cities",
    });
  }
};

export const getCityById = async (req: Request, res: Response) => {
  try {
    const city = await CityService.getCityById(req.params.id as string);

    return res.status(200).json({
      success: true,
      data: city,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to get city",
    });
  }
};

export const deleteCity = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    const city = await CityService.softDeleteCity(
      req.params.id as string,
      status,
    );

    return res.status(200).json({
      success: true,
      message: `City ${status ? "activated" : "deactivated"} successfully`,
      data: city,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to change city status",
    });
  }
};
