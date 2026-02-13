import { RitualService } from '../services/ritual.service.js';
export const createService = async (req, res) => {
    try {
        const service = await RitualService.create(req.body);
        res.status(201).json({ success: true, data: service });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const updateService = async (req, res) => {
    try {
        const updated = await RitualService.update(req.params.id, req.body);
        if (!updated)
            return res.status(404).json({ message: "Service not found" });
        res.status(200).json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const getServices = async (req, res) => {
    try {
        const services = await RitualService.findAll();
        res.status(200).json({ success: true, count: services.length, data: services });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const getServiceById = async (req, res) => {
    try {
        const service = await RitualService.findById(req.params.id);
        if (!service)
            return res.status(404).json({ message: "Service not found" });
        res.status(200).json({ success: true, data: service });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const deleteService = async (req, res) => {
    try {
        const deleted = await RitualService.remove(req.params.id);
        if (!deleted)
            return res.status(404).json({ message: "Service not found" });
        res.status(200).json({ success: true, message: "Service deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
//# sourceMappingURL=service.controllers.js.map