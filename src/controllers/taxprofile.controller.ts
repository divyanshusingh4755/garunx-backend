import type {
    NextFunction,
    Request,
    Response,
} from "express";

import {
    TaxProfileService,
    type TaxProfileFilters,
} from "../services/taxprofile.service.js";

function getAuthenticatedUserId(
    req: Request,
): string | undefined {
    const user = (req as any).user;

    return (
        user?._id?.toString() ||
        user?.id?.toString() ||
        user?.userId?.toString()
    );
}

export class TaxProfileController {
    static async create(
        req: Request,
        res: Response,
        next: NextFunction,
    ) {
        try {
            const adminId =
                getAuthenticatedUserId(req);

            const taxProfile =
                await TaxProfileService
                    .createTaxProfile({
                        ...req.body,
                        createdBy: adminId,
                    });

            return res.status(201).json({
                success: true,
                message:
                    "Tax profile created successfully",
                data: taxProfile,
            });
        } catch (error) {
            next(error);
        }
    }

    static async list(
        req: Request,
        res: Response,
        next: NextFunction,
    ) {
        try {
            const isActive =
                req.query.isActive === undefined
                    ? undefined
                    : req.query.isActive === "true";

            const filters: TaxProfileFilters = {};

            if (req.query.search) {
                filters.search = req.query.search as string;
            }

            if (req.query.treatment) {
                filters.treatment = req.query.treatment as any;
            }

            if (req.query.isActive !== undefined) {
                filters.isActive = req.query.isActive === "true";
            }

            if (req.query.page) {
                filters.page = Number(req.query.page);
            }

            if (req.query.limit) {
                filters.limit = Number(req.query.limit);
            }

            const result =
                await TaxProfileService.getTaxProfiles(filters);

            return res.status(200).json({
                success: true,
                message:
                    "Tax profiles fetched successfully",
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }

    static async listActive(
        _req: Request,
        res: Response,
        next: NextFunction,
    ) {
        try {
            const taxProfiles =
                await TaxProfileService
                    .getActiveTaxProfiles();

            return res.status(200).json({
                success: true,
                message:
                    "Active tax profiles fetched successfully",
                data: taxProfiles,
            });
        } catch (error) {
            next(error);
        }
    }

    static async getById(
        req: Request,
        res: Response,
        next: NextFunction,
    ) {
        try {
            const taxProfile =
                await TaxProfileService
                    .getTaxProfileById(
                        req.params.taxProfileId as string,
                    );

            return res.status(200).json({
                success: true,
                data: taxProfile,
            });
        } catch (error) {
            next(error);
        }
    }

    static async update(
        req: Request,
        res: Response,
        next: NextFunction,
    ) {
        try {
            const adminId =
                getAuthenticatedUserId(req);

            const taxProfile =
                await TaxProfileService
                    .updateTaxProfile(
                        req.params.taxProfileId as string,
                        {
                            ...req.body,
                            updatedBy: adminId,
                        },
                    );

            return res.status(200).json({
                success: true,
                message:
                    "Tax profile updated successfully",
                data: taxProfile,
            });
        } catch (error) {
            next(error);
        }
    }

    static async updateStatus(
        req: Request,
        res: Response,
        next: NextFunction,
    ) {
        try {
            const adminId =
                getAuthenticatedUserId(req);

            const taxProfile =
                await TaxProfileService
                    .updateTaxProfileStatus(
                        req.params.taxProfileId as string,
                        req.body.isActive,
                        adminId,
                    );

            return res.status(200).json({
                success: true,
                message: req.body.isActive
                    ? "Tax profile activated successfully"
                    : "Tax profile deactivated successfully",
                data: taxProfile,
            });
        } catch (error) {
            next(error);
        }
    }
}