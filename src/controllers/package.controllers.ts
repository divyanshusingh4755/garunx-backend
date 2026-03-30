import type { Request, Response } from "express"
import { PackageService } from "../services/package.service.js"

export const createPackage = async (req: Request, res: Response) => {
    try {
        const newPackage = await PackageService.create(req.body);
        res.status(201).json({ success: true, data: newPackage })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const getPacakgesByLocation = async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params
        const packages = await PackageService.fetchByLocation(locationId);
        res.status(200).json({ success: true, count: packages.length, data: packages })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const getPacakgeById = async (req: Request, res: Response) => {
    try {
        const packages = await PackageService.findById(req.params.id as string);
        res.status(200).json({ success: true, data: packages })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const updatePackage = async (req: Request, res: Response) => {
    try {
        const updated = await PackageService.update(req.params.id as string, req.body);
        if (!updated) return res.status(404).json({ message: "Package not found" })
        res.status(201).json({ success: true, data: updated })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const togglePackageStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { status } = req.body;

        if (typeof status !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: "Status must be a boolean (true/false)"
            })
        }

        const updated = await PackageService.toggleStatus(id as string, status);

        if (!updated) return res.status(404).json({ message: "Package not found" })

        res.status(200).json({
            success: true,
            message: `Package ${status ? 'activated' : 'deactivated'} successfully`,
            data: updated
        })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const getAllPackages = async (req: Request, res: Response) => {
    try {
        const { isActive, ...otherFilters } = req.query;
        const filter: Record<string, any> = { ...otherFilters };
        if (isActive === 'true') filter.isActive = true;
        if (isActive === 'false') filter.isActive = false;
        const packages = await PackageService.getAllPackages(filter);
        return res.status(200).json({ success: true, data: packages })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message })
    }
}