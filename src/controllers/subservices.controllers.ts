import type { Request, Response } from "express";
import { SubServiceComponentService } from "../services/subservices.service.js";

const getStatusCode = (error: any): number => {
  if (typeof error?.statusCode === "number") { return error.statusCode; }
  if (error?.name === "ValidationError") { return 400; }
  if (error?.code === 11000) { return 409; }
  return 500;
};

export const createSubServiceComponent = async (req: Request, res: Response) => {
  try {
    const { name, description, serviceId, image, isActive } = req.body;

    const component = await SubServiceComponentService.createSubServiceComponent({
      name,
      description,
      serviceId,
      ...(image !== undefined && { image }),
      ...(isActive !== undefined && { isActive }),
    });

    return res.status(201).json({
      success: true,
      message: "Sub Service Component created successfully",
      data: component,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to create Sub Service Component",
    });
  }
};

export const updateSubServiceComponent = async (req: Request, res: Response) => {
  try {
    const result = await SubServiceComponentService.updateSubServiceComponent(req.params.id as string, req.body);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to update Sub Service Component",
    });
  }
};

export const getAllSubServiceComponents = async (req: Request, res: Response) => {
  try {
    const { searchTerm, serviceId, limit, page, sortBy, sortOrder } = req.query;

    const result = await SubServiceComponentService.findSubServiceComponents({
      limit: limit ? Number(limit) : 40,
      page: page ? Number(page) : 1,

      isActive: true,

      sortBy: typeof sortBy === "string" ? sortBy : "name",
      sortOrder: sortOrder === "asc" || sortOrder === "desc" ? sortOrder : "asc",
      ...(typeof searchTerm === "string" && { searchTerm }),
      ...(typeof serviceId === "string" && { serviceId }),
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
      message: error.message || "Failed to fetch Sub Service Components",
    });
  }
};

export const getAllSubServiceComponentsAdmin = async (req: Request, res: Response) => {
  try {
    const { searchTerm, serviceId, limit, page, isActive, sortBy, sortOrder } = req.query;
    const activeStatus = isActive === "true" ? true : isActive === "false" ? false : undefined;

    const result = await SubServiceComponentService.findSubServiceComponents({
      limit: limit ? Number(limit) : 40,
      page: page ? Number(page) : 1,
      sortBy: typeof sortBy === "string" ? sortBy : "name",
      sortOrder: sortOrder === "asc" || sortOrder === "desc" ? sortOrder : "asc",
      ...(typeof searchTerm === "string" && { searchTerm }),
      ...(typeof serviceId === "string" && { serviceId }),
      ...(typeof activeStatus === "boolean" && { isActive: activeStatus }),
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
      message: error.message || "Failed to fetch Sub Service Components",
    });
  }
};

export const getSubServiceComponentById = async (req: Request, res: Response) => {
  try {
    const subServiceComponent = await SubServiceComponentService.getSubServiceComponentById(req.params.id as string);

    return res.status(200).json({
      success: true,
      data: subServiceComponent,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to get Sub Service Component",
    });
  }
};

export const toggleSubServiceComponent = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    const subServiceComponent = await SubServiceComponentService.toggleSubServiceComponent(req.params.id as string, status);

    return res.status(200).json({
      success: true,
      message: `Sub Service Component ${status ? "activated" : "deactivated"} successfully`,
      data: subServiceComponent,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to change Sub Service Component status",
    });
  }
};
