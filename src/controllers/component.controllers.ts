import type { Request, Response } from "express";
import { ComponentService } from "../services/component.service.js";

export const createComponent = async (req: Request, res: Response) => {
  try {
    const component = await ComponentService.createComponent(req.body);

    res.status(201).json({
      success: true,
      data: component,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create component",
    });
  }
};

export const updateComponent = async (req: Request, res: Response) => {
  try {
    const { componentId } = req.params;

    const component = await ComponentService.updateComponent(
      componentId as string,
      req.body,
    );

    res.status(200).json({
      success: true,
      data: component,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update component",
    });
  }
};

export const toggleComponentStatus = async (req: Request, res: Response) => {
  try {
    const { componentId } = req.params;
    const { isActive, confirmed } = req.body;

    const result = await ComponentService.toggleComponentStatus(
      componentId as string,
      isActive,
      confirmed,
    );

    if ((result as any)?.requiresConfirmation) {
      return res.status(200).json({
        success: true,
        requiresConfirmation: true,
        message: "This component is used in services and pricing records.",
        data: result,
      });
    }

    return res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update component status",
    });
  }
};

export const getComponentById = async (req: Request, res: Response) => {
  try {
    const { componentId } = req.params;

    const component = await ComponentService.getComponentById(
      componentId as string,
    );

    res.status(200).json({
      success: true,
      data: component,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || "Component not found",
    });
  }
};

export const getAllComponents = async (req: Request, res: Response) => {
  try {
    const {
      searchTerm,
      categoryId,
      tier,
      limit,
      page,
      isRemovable,
      isActive,
      isBundled,
      sortBy,
      sortOrder,
    } = req.query;

    const parseBool = (val: any) =>
      val === "true" ? true : val === "false" ? false : undefined;

    const {
      data,
      total,
      page: CurrentPage,
      totalPages,
    } = await ComponentService.FindComponents(
      searchTerm as string,
      categoryId as string,
      Number(limit) || 20,
      Number(page) || 1,
      parseBool(isRemovable),
      parseBool(isActive),
      parseBool(isBundled),
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
      message: error.message || "Failed to fetch products",
    });
  }
};
