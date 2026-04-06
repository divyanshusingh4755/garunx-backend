import type { Request, Response } from 'express';
import { ServiceService } from '../services/service.service.js';

export const createService = async (req: Request, res: Response) => {
    try {
        const service = await ServiceService.createService(req.body);

        res.status(201).json({
            success: true,
            data: service
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const updateService = async (req: Request, res: Response) => {
    try {
        const { serviceId } = req.params;

        const service = await ServiceService.updateService(
            serviceId as string,
            req.body
        );

        res.status(200).json({
            success: true,
            data: service
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteService = async (req: Request, res: Response) => {
    try {
        const { serviceId } = req.params;

        await ServiceService.deleteService(serviceId as string);

        res.status(200).json({
            success: true,
            message: "Service deactivated successfully"
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const getServiceById = async (req: Request, res: Response) => {
    try {
        const { serviceId } = req.params;

        const service = await ServiceService.getServiceById(serviceId as string);

        res.status(200).json({
            success: true,
            data: service
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const addSubService = async (req: Request, res: Response) => {
    try {
        const { serviceId } = req.params

        const service = await ServiceService.addSubService(
            serviceId as string,
            req.body
        )

        res.status(201).json({ success: true, data: service })
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message
        })
    }
}

export const addProductsToSubService = async (req: Request, res: Response) => {
    try {
        const { serviceId, subServiceId } = req.params
        const { variantIds } = req.body;

        const service = await ServiceService.addProductsToSubService(
            serviceId as string,
            subServiceId as string,
            variantIds
        )

        res.status(200).json({ success: true, data: service })
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message
        })
    }
}

export const getServiceDetails = async (req: Request, res: Response) => {
    try {
        const { serviceId } = req.params;
        const { location } = req.query;

        const service = await ServiceService.getServiceWithProducts(
            serviceId as string,
            location as string
        )

        res.status(200).json({ success: true, data: service })
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message
        })
    }
}

export const updateSubService = async (req: Request, res: Response) => {
    try {
        const { serviceId, subServiceId } = req.params

        const service = await ServiceService.updateSubService(
            serviceId as string,
            subServiceId as string,
            req.body
        )

        res.status(200).json({
            success: true,
            data: service
        })
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message
        })
    }
}

export const deleteSubService = async (req: Request, res: Response) => {
    try {
        const { serviceId, subServiceId } = req.params

        const service = await ServiceService.deleteSubService(
            serviceId as string,
            subServiceId as string
        )

        res.status(200).json({
            success: true,
            data: service
        })
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message
        })
    }
}

export const removeProductFromSubService = async (req: Request, res: Response) => {
    try {
        const { serviceId, subServiceId, productId } = req.params;

        const service = await ServiceService.removeProductFromSubService(
            serviceId as string,
            subServiceId as string,
            productId as string
        )

        res.status(200).json({
            success: true,
            data: service
        })
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message
        })
    }
}

export const getAllServices = async (req: Request, res: Response) => {
    try {
        const {
            searchTerm,
            location,
            category,
            limit,
            page,
            isActive,
            sortBy,
            sortOrder
        } = req.query;

        const { data, total, page: CurrentPage, totalPages } = await ServiceService.FindServices(
            searchTerm as string,
            location as string,
            category as string,
            Number(limit) || 20,
            Number(page) || 1,
            isActive === 'false' ? false : true, // Default to true for services
            (sortBy as string) || 'name',
            (sortOrder as 'asc' | 'desc') || 'asc'
        );

        res.status(200).json({
            success: true,
            data,
            total,
            CurrentPage,
            totalPages
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch services"
        });
    }
}

export const getFilteredServices = async (req: Request, res: Response) => {
    try {
        const { categories, locations, page, limit } = req.query;

        if (!categories || !locations) {
            return res.status(400).json({
                success: false,
                message: "Both categories and locations are required filters."
            });
        }

        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 10;

        const { services, total } = await ServiceService.getServicesByFilters(
            categories as string | string[],
            locations as string | string[],
            pageNum,
            limitNum
        );

        return res.status(200).json({
            success: true,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            },
            data: services
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
}