import type { Request, Response } from "express";

import { PolicyService } from "../services/policy.service.js";

type PolicyType = "TERMS" | "PRIVACY" | "REFUND";
type UserType = "User" | "Coordinator";

export const createPolicy = async (req: Request, res: Response) => {
  try {
    const data = await PolicyService.createPolicy(req.body);

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updatePolicy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const data = await PolicyService.updatePolicy(id as string, req.body);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllPolicies = async (req: Request, res: Response) => {
  try {
    const { page, isActive, limit, type, userType } = req.query;

    const {
      data,
      total,
      page: currentPage,
      totalPages,
    } = await PolicyService.getAllPolicies(
      Number(page) || 1,
      Number(limit) || 20,
      isActive === "true" ? true : isActive === "false" ? false : undefined,
      type as PolicyType | undefined,
      userType as UserType | undefined,
    );

    return res.status(200).json({
      success: true,
      data,
      total,
      page: currentPage,
      totalPages,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const togglePolicyStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const data = await PolicyService.togglePolicyStatus(id as string, isActive);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPolicyByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { userType } = req.query;

    const data = await PolicyService.getPolicyByType(
      type as PolicyType,
      userType as UserType,
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};
