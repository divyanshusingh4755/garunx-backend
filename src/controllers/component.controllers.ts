import type { Request, Response } from "express";
import { ComponentService } from "../services/component.service.js";

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

export const createComponent = async (req: Request, res: Response) => {
  try {
    const {
      name,
      categoryId,
      description,
      imageUrl,
      isRemovable,
      isBundled,
      isActive,
    } = req.body;

    const component = await ComponentService.createComponent({
      name,
      categoryId,
      description,

      ...(imageUrl !== undefined && {
        imageUrl,
      }),

      ...(isRemovable !== undefined && {
        isRemovable,
      }),

      ...(isBundled !== undefined && {
        isBundled,
      }),

      ...(isActive !== undefined && {
        isActive,
      }),
    });

    return res.status(201).json({
      success: true,
      data: component,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to create component",
    });
  }
};

export const updateComponent = async (req: Request, res: Response) => {
  try {
    const component = await ComponentService.updateComponent(
      req.params.componentId as string,
      req.body,
    );

    return res.status(200).json({
      success: true,
      data: component,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to update component",
    });
  }
};

export const toggleComponentStatus = async (req: Request, res: Response) => {
  try {
    const { isActive, confirmed = false } = req.body;

    const result = await ComponentService.toggleComponentStatus(
      req.params.componentId as string,
      isActive,
      confirmed,
    );

    if (result.requiresConfirmation) {
      return res.status(200).json({
        success: true,
        requiresConfirmation: true,
        message: "This component is used in services and pricing records.",
        data: result,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Component ${isActive ? "activated" : "deactivated"
        } successfully`,
      data: result,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Failed to update component status",
    });
  }
};

export const getComponentById = async (req: Request, res: Response) => {
  try {
    const component = await ComponentService.getComponentById(
      req.params.componentId as string,
    );

    return res.status(200).json({
      success: true,
      data: component,
    });
  } catch (error: any) {
    return res.status(getStatusCode(error)).json({
      success: false,
      message: error.message || "Component not found",
    });
  }
};

export const getAllComponents = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      searchTerm,
      categoryId,
      limit,
      page,
      isRemovable,
      isBundled,
      sortBy,
      sortOrder,
    } = req.query;

    const parseBoolean = (
      value: unknown,
    ): boolean | undefined => {
      if (value === "true") return true;
      if (value === "false") return false;

      return undefined;
    };

    const removableStatus =
      parseBoolean(isRemovable);

    const bundledStatus =
      parseBoolean(isBundled);

    const result =
      await ComponentService.findComponents({
        limit:
          limit ? Number(limit) : 20,

        page:
          page ? Number(page) : 1,

        /*
         * Public API must never expose
         * inactive components.
         */
        isActive: true,

        sortBy:
          typeof sortBy === "string"
            ? sortBy
            : "name",

        sortOrder:
          sortOrder === "asc" ||
            sortOrder === "desc"
            ? sortOrder
            : "asc",

        ...(typeof searchTerm ===
          "string" && {
          searchTerm,
        }),

        ...(typeof categoryId ===
          "string" && {
          categoryId,
        }),

        ...(removableStatus !==
          undefined && {
          isRemovable:
            removableStatus,
        }),

        ...(bundledStatus !==
          undefined && {
          isBundled:
            bundledStatus,
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
    return res
      .status(getStatusCode(error))
      .json({
        success: false,
        message:
          error.message ||
          "Failed to fetch components",
      });
  }
};

export const getAllComponentsAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      searchTerm,
      categoryId,
      limit,
      page,
      isRemovable,
      isActive,
      isBundled,
      sortBy,
      sortOrder,
    } = req.query;

    const parseBoolean = (
      value: unknown,
    ): boolean | undefined => {
      if (value === "true") {
        return true;
      }

      if (value === "false") {
        return false;
      }

      return undefined;
    };

    const removableStatus =
      parseBoolean(isRemovable);

    const activeStatus =
      parseBoolean(isActive);

    const bundledStatus =
      parseBoolean(isBundled);

    const result =
      await ComponentService.findComponents({
        limit:
          limit ? Number(limit) : 20,

        page:
          page ? Number(page) : 1,

        sortBy:
          typeof sortBy === "string"
            ? sortBy
            : "name",

        sortOrder:
          sortOrder === "asc" ||
            sortOrder === "desc"
            ? sortOrder
            : "asc",

        ...(typeof searchTerm ===
          "string" && {
          searchTerm,
        }),

        ...(typeof categoryId ===
          "string" && {
          categoryId,
        }),

        ...(removableStatus !==
          undefined && {
          isRemovable:
            removableStatus,
        }),

        ...(activeStatus !==
          undefined && {
          isActive:
            activeStatus,
        }),

        ...(bundledStatus !==
          undefined && {
          isBundled:
            bundledStatus,
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
    return res
      .status(getStatusCode(error))
      .json({
        success: false,
        message:
          error.message ||
          "Failed to fetch components",
      });
  }
};

export const exportComponentsCsv = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      componentIds,
    }: {
      componentIds: string[];
    } = req.body;

    const result =
      await ComponentService
        .exportComponentsToCsv(
          componentIds,
        );

    const timestamp =
      new Date()
        .toISOString()
        .replace(
          /[:.]/g,
          "-",
        );

    res.setHeader(
      "Content-Type",
      "text/csv; charset=utf-8",
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="components-${timestamp}.csv"`,
    );

    return res
      .status(200)
      .send(
        result.csv,
      );
  } catch (error: any) {
    return res
      .status(getStatusCode(error))
      .json({
        success: false,
        message:
          error.message ||
          "Failed to export components",
      });
  }
};