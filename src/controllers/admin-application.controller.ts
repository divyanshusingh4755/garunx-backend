import type { Request, Response } from "express";
import { AdminApplicationService } from "../services/admin-application.service.js";

export const submitAdminApplication = async (req: Request, res: Response) => {
    try {
        const data = await AdminApplicationService.submit(req.body);

        return res.status(201).json({
            success: true,
            message: "Admin application submitted successfully",
            data,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message || "Application failed",
        });
    }
};

export const listAdminApplications = async (req: Request, res: Response) => {
    try {
        const status = String(req.query.status ?? "PENDING");
        const data = await AdminApplicationService.list(status);

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

export const decideAdminApplication = async (req: Request, res: Response) => {
    try {
        const adminId = req.user?.userId;

        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const data = await AdminApplicationService.decide(
            String(req.params.id),
            adminId,
            req.body.decision,
        );

        return res.status(200).json({
            success: true,
            message: `Admin application ${data.status.toLowerCase()}`,
            data,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message || "Decision failed",
        });
    }
};
