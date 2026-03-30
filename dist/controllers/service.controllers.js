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
export const deleteService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        await ServiceService.deleteService(serviceId);
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
export const addProductsToSubService = async (req, res) => {
    try {
        const { serviceId, subServiceId } = req.params;
        const { productIds } = req.body;
        const service = await ServiceService.addProductsToSubService(serviceId, subServiceId, productIds);
        res.status(200).json({ success: true, data: service });
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
export const deleteSubService = async (req, res) => {
    try {
        const { serviceId, subServiceId } = req.params;
        const service = await ServiceService.deleteSubService(serviceId, subServiceId);
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
export const removeProductFromSubService = async (req, res) => {
    try {
        const { serviceId, subServiceId, productId } = req.params;
        const service = await ServiceService.removeProductFromSubService(serviceId, subServiceId, productId);
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
        const { location } = req.query;
        const services = await ServiceService.getAllService(location);
        res.status(200).json({
            success: true,
            data: services
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
//# sourceMappingURL=service.controllers.js.map