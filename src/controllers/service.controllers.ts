import type { Request, Response } from 'express';
import { RitualService } from '../services/ritual.service.js';

export const createService = async (req: Request, res: Response) => {
    try {
        const service = await RitualService.create(req.body);
        res.status(201).json({ success: true, data: service });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateService = async (req: Request, res: Response) => {
    try {
        const updated = await RitualService.update(req.params.id as string, req.body);
        if (!updated) return res.status(404).json({ message: "Service not found" });
        res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getServices = async (req: Request, res: Response) => {
    try {
        const { isActive, ...otherFilters } = req.query;
        const filter: Record<string, any> = { ...otherFilters };
        if (isActive === 'true') filter.isActive = true;
        if (isActive === 'false') filter.isActive = false;
        const services = await RitualService.findAll(filter);
        res.status(200).json({ success: true, count: services.length, data: services });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getServiceById = async (req: Request, res: Response) => {
    try {
        const service = await RitualService.findById(req.params.id as string);
        if (!service) return res.status(404).json({ message: "Service not found" });
        res.status(200).json({ success: true, data: service });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteService = async (req: Request, res: Response) => {
    try {
        const deleted = await RitualService.remove(req.params.id as string);
        if (!deleted) return res.status(404).json({ message: "Service not found" });
        res.status(200).json({ success: true, message: "Service deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
