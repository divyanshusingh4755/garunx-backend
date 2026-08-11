import type { Request, Response } from "express";
import { CategoryService } from "../services/category.service.js";

const parsePositiveInteger = (
  value: unknown,
  fallback: number,
  maximum?: number,
) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return maximum ? Math.min(parsed, maximum) : parsed;
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { label, value, type, image, description, displayOrder, isActive } =
      req.body;

    const newCategory = await CategoryService.createCategory({
      label,
      value,
      type,
      image,
      description,
      displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
      isActive: typeof isActive === "boolean" ? isActive : true,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (error: any) {
    const status = error.message.includes("already exists") ? 409 : 400;

    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, value, type, image, description, displayOrder, isActive } =
      req.body;

    const updatedCategory = await CategoryService.updateCategory(id as string, {
      label,
      value,
      type,
      image,
      description,
      displayOrder,
      isActive,
    });

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error: any) {
    const status =
      error.message === "Category not found"
        ? 404
        : error.message.includes("already exists")
          ? 409
          : 400;

    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await CategoryService.getCategoryById(id as string);

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error: any) {
    return res.status(error.message === "Category not found" ? 404 : 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await CategoryService.deleteCategory(id as string);

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error: any) {
    const status = error.message === "Category not found" ? 404 : 400;

    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

export const toggleCategoryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { confirmed = false } = req.body;

    const result = await CategoryService.toggleCategoryStatus(
      id as string,
      confirmed,
    );

    if (result.requiresConfirmation) {
      return res.status(200).json({
        success: true,
        requiresConfirmation: true,
        message:
          "This category is linked with components, services, or packages.",
        data: result,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Category ${
        result.isActive ? "activated" : "deactivated"
      } successfully`,
      data: result,
    });
  } catch (error: any) {
    return res.status(error.message === "Category not found" ? 404 : 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const { searchTerm, type, limit, page, isActive, sortBy, sortOrder } =
      req.query;

    const parsedLimit = parsePositiveInteger(limit, 40, 100);
    const parsedPage = parsePositiveInteger(page, 1);

    const {
      data,
      total,
      page: currentPage,
      totalPages,
    } = await CategoryService.findCategories(
      searchTerm as string,
      type as "service" | "product",
      parsedLimit,
      parsedPage,
      isActive === "true" ? true : isActive === "false" ? false : undefined,
      (sortBy as string) || "displayOrder",
      (sortOrder as "asc" | "desc") || "asc",
    );

    return res.status(200).json({
      success: true,
      data,
      total,
      currentPage,
      totalPages,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch categories",
    });
  }
};
