import type { Request, Response } from "express";

import { PolicyService } from "../services/policy.service.js";

type PolicyType = "TERMS" | "PRIVACY" | "REFUND";

type UserType = "User" | "Coordinator";

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const getErrorStatus = (
  error: unknown,
): number => {
  if (!(error instanceof Error)) {
    return 400;
  }

  if (
    error.message ===
    "Policy not found" ||
    error.message.includes(
      "policy not found",
    ) ||
    error.message ===
    "No policies found for export"
  ) {
    return 404;
  }

  return 400;
};

export const createPolicy = async (req: Request, res: Response) => {
  try {
    const { type, userType, title, content } = req.body;

    const data = await PolicyService.createPolicy({
      type,
      userType,
      title,
      content,
    });

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "A policy version was created concurrently. Please retry.",
      });
    }

    return res.status(400).json({
      success: false,
      message: getErrorMessage(error, "Failed to create policy"),
    });
  }
};

export const updatePolicy = async (req: Request, res: Response) => {
  try {
    const payload: {
      title?: string;
      content?: string;
    } = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "title")) {
      payload.title = req.body.title;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "content")) {
      payload.content = req.body.content;
    }

    const data = await PolicyService.updatePolicy(
      req.params.id as string,
      payload,
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Failed to update policy"),
    });
  }
};

export const getAllPolicies = async (req: Request, res: Response) => {
  try {
    const { page, isActive, limit, type, userType } = req.query;

    const parsedPage = typeof page === "number" ? page : Number(page);

    const parsedLimit = typeof limit === "number" ? limit : Number(limit);

    const result = await PolicyService.getAllPolicies(
      Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
      Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 20,
      isActive === "true" ? true : isActive === "false" ? false : undefined,
      typeof type === "string" ? (type as PolicyType) : undefined,
      typeof userType === "string" ? (userType as UserType) : undefined,
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error, "Failed to fetch policies"),
    });
  }
};

export const togglePolicyStatus = async (req: Request, res: Response) => {
  try {
    const data = await PolicyService.togglePolicyStatus(
      req.params.id as string,
      req.body.isActive,
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Failed to update policy status"),
    });
  }
};

export const getPolicyByType = async (req: Request, res: Response) => {
  try {
    const data = await PolicyService.getPolicyByType(
      req.params.type as PolicyType,
      req.query.userType as UserType,
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Failed to fetch policy"),
    });
  }
};

export const exportPoliciesCsv = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      policyIds,
    }: {
      policyIds: string[];
    } = req.body;

    const result =
      await PolicyService.exportPoliciesToCsv(
        policyIds,
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
      `attachment; filename="policies-${timestamp}.csv"`,
    );

    return res
      .status(200)
      .send(
        result.csv,
      );
  } catch (
  error: unknown
  ) {
    return res
      .status(
        getErrorStatus(
          error,
        ),
      )
      .json({
        success: false,

        message:
          getErrorMessage(
            error,
            "Failed to export policies",
          ),
      });
  }
};