import type { Request, Response } from "express";
import ComponentItemService from "../services/componentitem.service.js";

export const createComponentItem = async (req: Request, res: Response) => {
  try {
    const componentItem = await ComponentItemService.createComponentItem(
      req.body,
    );

    res.status(201).json({
      success: true,
      data: componentItem,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create component item",
    });
  }
};

export const updateComponentItem = async (req: Request, res: Response) => {
  try {
    const { componentItemId } = req.params;
    const componentItem = await ComponentItemService.updateComponentItem(
      componentItemId as string,
      req.body,
    );

    res.status(200).json({
      success: true,
      data: componentItem,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update component item",
    });
  }
};

export const getComponentItemById = async (req: Request, res: Response) => {
  try {
    const { componentItemId } = req.params;
    const componentItem = await ComponentItemService.getComponentItemById(
      componentItemId as string,
    );

    res.status(200).json({
      success: true,
      data: componentItem,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to get component item by id",
    });
  }
};

export const getAllComponentItems = async (req: Request, res: Response) => {
  try {
    const { searchTerm, limit, page, isActive, sortBy, sortOrder } = req.query;
    const parseBool = (val: any) =>
      val === "true" ? true : val === "false" ? false : undefined;
    const {
      data,
      total,
      page: CurrentPage,
      totalPages,
    } = await ComponentItemService.getAllComponentItems(
      searchTerm as string,
      Number(limit) || 20,
      Number(page) || 1,
      parseBool(isActive),
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
      message: error.message || "Failed to get all component item",
    });
  }
};

export const updateComponentItemStatus = async (
  req: Request,
  res: Response,
) => {
  try {
    const { componentItemId } = req.params;
    const { isActive } = req.body;

    const result = await ComponentItemService.updateComponentItemStatus(
      componentItemId as string,
      isActive,
    );
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Falied to update status of component item",
    });
  }
};
