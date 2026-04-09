import { ServiceService } from '../services/service.service.js';
export const createService = async (req, res) => {
    try {
        const service = await ServiceService.createService(req.body);
        res.status(201).json({
            success: true,
            data: service
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
export const updateService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const service = await ServiceService.updateService(serviceId, req.body);
        res.status(200).json({
            success: true,
            data: service
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
export const toggleServiceStatus = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { isActive } = req.body;
        await ServiceService.toggleServiceStatus(serviceId, isActive);
        res.status(200).json({
            success: true,
            message: "Service deactivated successfully"
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
export const getServiceById = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const service = await ServiceService.getServiceById(serviceId);
        res.status(200).json({
            success: true,
            data: service
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
export const addSubService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const service = await ServiceService.addSubService(serviceId, req.body);
        res.status(201).json({ success: true, data: service });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
export const addVariantsToSubService = async (req, res) => {
    try {
        const { serviceId, subServiceId } = req.params;
        const { variants, isComplete } = req.body;
        if (!Array.isArray(variants)) {
            return res.status(400).json({
                success: false,
                message: "variants must be an array of objects"
            });
        }
        const updatedService = await ServiceService.addVariantsToSubService(serviceId, subServiceId, isComplete, variants);
        res.status(200).json({
            success: true,
            data: updatedService
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
export const getServiceDetails = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { location } = req.query;
        const service = await ServiceService.getServiceWithProducts(serviceId, location);
        res.status(200).json({ success: true, data: service });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
export const updateSubService = async (req, res) => {
    try {
        const { serviceId, subServiceId } = req.params;
        const service = await ServiceService.updateSubService(serviceId, subServiceId, req.body);
        res.status(200).json({
            success: true,
            data: service
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
export const toggleSubServiceStatus = async (req, res) => {
    try {
        const { serviceId, subServiceId } = req.params;
        const { isActive } = req.body;
        const service = await ServiceService.toggleSubServiceStatus(serviceId, subServiceId, isActive);
        res.status(200).json({
            success: true,
            data: service
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
export const updateVariantInSubService = async (req, res) => {
    try {
        const { serviceId, subServiceId, variantId } = req.params;
        const { isOptional, isEditable, displayOrder, isComplete } = req.body;
        const updatedService = await ServiceService.updateVariantInSubService(serviceId, subServiceId, variantId, isComplete, { isOptional, isEditable, displayOrder });
        res.status(200).json({
            success: true,
            data: updatedService
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
export const removeProductFromSubService = async (req, res) => {
    try {
        const { serviceId, subServiceId, variantId } = req.params;
        const service = await ServiceService.removeVariantFromSubService(serviceId, subServiceId, variantId);
        res.status(200).json({
            success: true,
            data: service
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
export const getAllServices = async (req, res) => {
    try {
        const { searchTerm, location, category, limit, page, isActive, isComplete, sortBy, sortOrder } = req.query;
        const activeBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
        const completeBool = isComplete === 'true' ? true : isComplete === 'false' ? false : undefined;
        const { data, total, page: CurrentPage, totalPages } = await ServiceService.FindServices(searchTerm, location, category, Number(limit) || 20, Number(page) || 1, activeBool, completeBool, sortBy || 'name', sortOrder || 'asc');
        res.status(200).json({
            success: true,
            data,
            total,
            CurrentPage,
            totalPages
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch services"
        });
    }
};
export const getFilteredServices = async (req, res) => {
    try {
        const { categories, locations, page, limit } = req.query;
        if (!categories) {
            return res.status(400).json({
                success: false,
                message: "Categories are required filters. Location is optional"
            });
        }
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const { services, total } = await ServiceService.getServicesByFilters(categories, locations, pageNum, limitNum);
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
//# sourceMappingURL=service.controllers.js.map