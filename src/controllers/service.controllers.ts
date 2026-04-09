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

export const toggleServiceStatus = async (req: Request, res: Response) => {
    try {
        const { serviceId } = req.params;
        const { isActive } = req.body;

        await ServiceService.toggleServiceStatus(serviceId as string, isActive);

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

export const addVariantsToSubService = async (req: Request, res: Response) => {
    try {
        const { serviceId, subServiceId } = req.params;

        const { variants, isComplete } = req.body;

        if (!Array.isArray(variants)) {
            return res.status(400).json({
                success: false,
                message: "variants must be an array of objects"
            });
        }

        const updatedService = await ServiceService.addVariantsToSubService(
            serviceId as string,
            subServiceId as string,
            isComplete,
            variants
        );

        res.status(200).json({
            success: true,
            data: updatedService
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message
        });
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

export const toggleSubServiceStatus = async (req: Request, res: Response) => {
    try {
        const { serviceId, subServiceId } = req.params
        const { isActive } = req.body;

        const service = await ServiceService.toggleSubServiceStatus(
            serviceId as string,
            subServiceId as string,
            isActive
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

export const updateVariantInSubService = async (req: Request, res: Response) => {
    try {
        const { serviceId, subServiceId, variantId } = req.params;

        const { isOptional, isEditable, displayOrder, isComplete } = req.body;

        const updatedService = await ServiceService.updateVariantInSubService(
            serviceId as string,
            subServiceId as string,
            variantId as string,
            isComplete,
            { isOptional, isEditable, displayOrder }
        );

        res.status(200).json({
            success: true,
            data: updatedService
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


export const removeProductFromSubService = async (req: Request, res: Response) => {
    try {
        const { serviceId, subServiceId, variantId } = req.params;

        const service = await ServiceService.removeVariantFromSubService(
            serviceId as string,
            subServiceId as string,
            variantId as string
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
            isComplete,
            sortBy,
            sortOrder
        } = req.query;

        const { data, total, page: CurrentPage, totalPages } = await ServiceService.FindServices(
            searchTerm as string,
            location as string,
            category as string,
            Number(limit) || 20,
            Number(page) || 1,
            isActive === 'false' ? false : true,
            isComplete === 'false' ? false : true,
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

        if (!categories) {
            return res.status(400).json({
                success: false,
                message: "Categories are required filters. Location is optional"
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