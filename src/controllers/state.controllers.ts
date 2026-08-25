import type { Request, Response } from "express";
import { StateService } from "../services/state.service.js";

const getStatusCode = (error: any): number => {
  if (typeof error?.statusCode === "number") { return error.statusCode; }
  if (error?.name === "ValidationError") { return 400; }
  if (error?.code === 11000) { return 409; }
  return 500;
};

export const createState = async (req: Request, res: Response) => {
  try {
    const { name, country, gstCode, image, description, location } = req.body;

    const state = await StateService.createState({
      name,
      country,
      gstCode,
      ...(image !== undefined && { image }),
      ...(description !== undefined && { description }),
      ...(location !== undefined && { location }),
    });

    return res.status(201).json({
      success: true,
      message: "State created successfully",
      data: state,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to create state",
    });
  }
};

export const updateState = async (req: Request, res: Response) => {
  try {
    const result = await StateService.updateState(req.params.id as string, req.body);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to update state",
    });
  }
};

export const getAllState = async (req: Request, res: Response) => {
  try {
    const { searchTerm, stateFilter, countryFilter, limit, page, sortBy, sortOrder } = req.query;

    const result = await StateService.findState({
      limit: limit ? Number(limit) : 40,
      page: page ? Number(page) : 1,

      isActive: true,

      sortBy: typeof sortBy === "string" ? sortBy : "createdAt",
      sortOrder: sortOrder === "asc" || sortOrder === "desc" ? sortOrder : "desc",
      ...(typeof searchTerm === "string" && { searchTerm }),
      ...(typeof countryFilter === "string" && { countryFilter }),
      ...(typeof stateFilter === "string" && { stateFilter }),
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
      message: error.message || "Failed to fetch states",
    });
  }
};

export const getAllStatesAdmin = async (req: Request, res: Response) => {
  try {
    const { searchTerm, stateFilter, countryFilter, limit, page, isActive, sortBy, sortOrder } = req.query;

    const activeStatus = isActive === "true" ? true : isActive === "false" ? false : undefined;

    const result = await StateService.findState({
      limit: limit ? Number(limit) : 40,
      page: page ? Number(page) : 1,
      sortBy: typeof sortBy === "string" ? sortBy : "createdAt",
      sortOrder: sortOrder === "asc" || sortOrder === "desc" ? sortOrder : "desc",
      ...(typeof searchTerm === "string" && { searchTerm }),
      ...(typeof countryFilter === "string" && { countryFilter }),
      ...(typeof stateFilter === "string" && { stateFilter }),
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
      message: error.message || "Failed to fetch states",
    });
  }
};

export const getStateById = async (req: Request, res: Response) => {
  try {
    const state = await StateService.getStateById(req.params.id as string);

    return res.status(200).json({
      success: true,
      data: state,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to get state",
    });
  }
};

export const deleteState = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    const state = await StateService.softDeleteState(req.params.id as string, status);

    return res.status(200).json({
      success: true,
      message: `State ${status ? "activated" : "deactivated"} successfully`,
      data: state,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to change state status",
    });
  }
};

export const exportStatesCsv = async (req: Request, res: Response) => {
  try {
    const { stateIds, exportAll = false }: { stateIds?: string[]; exportAll?: boolean; } = req.body;

    const result = await StateService.exportStatesToCsv({
      exportAll,
      ...(stateIds !== undefined && { stateIds, }),
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="states-${timestamp}.csv"`);

    return res.status(200).send(result.csv);
  } catch (error: any) {
    return res
      .status(getStatusCode(error)).json({
        success: false,
        message: error.message || "Failed to export states",
      });
  }
};