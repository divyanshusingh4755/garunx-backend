import type { Request, Response } from 'express';
import { LocationService } from "../services/location.service.js"
import { PackageService } from '../services/package.service.js';

export const createLocation = async (req: Request, res: Response) => {
    try {
        const {
            name,
            country,
            state,
            city,
            fullAddress,
            pincode,
            image,
            description,
            location } = req.body

        await LocationService.createLocation(
            name,
            country,
            state,
            city,
            fullAddress,
            pincode,
            image,
            description,
            location
        )
        res.status(200).json({ success: true, data: "Location created successfully" })
    } catch (error: any) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message
        })
    }
}

export const updateLocation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const result = await LocationService.updateLocation(id as string, req.body)
        res.status(200).json({ success: true, data: result })
    } catch (error: any) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message
        })
    }
}

export const getAllLocation = async (req: Request, res: Response) => {
    try {
        const {
            searchTerm,
            countryFilter,
            stateFilter,
            cityFilter,
            pincodeFilter,
            limit,
            page,
            isActive,
            sortBy,
            sortOrder
        } = req.query

        const { data, total, page: CurrentPage, totalPages } = await LocationService.FindLocation(
            searchTerm as string,
            countryFilter as string,
            stateFilter as string,
            cityFilter as string,
            pincodeFilter as string,
            Number(limit) || 40,
            Number(page) || 1,
            isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            (sortBy as string) || 'name',
            (sortOrder as 'asc' | 'desc') || 'asc'
        )
        res.status(200).json({ success: true, data, total, CurrentPage, totalPages })
    } catch (error: any) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message
        })
    }
}

export const getLocationById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const location = await LocationService.getLocationById(id as string)
        res.status(200).json({ success: true, data: location })
    } catch (error: any) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message
        })
    }
}

export const deleteLocation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { status } = req.body

        if (!id || status === undefined) {
            return res.status(400).json({
                success: false,
                message: "User ID and status are required."
            });
        }

        const location = await LocationService.softDeleteLocation(id as string, status)
        res.status(200).json({
            success: true,
            message: `Location marked as ${status}`,
            data: location
        })
    } catch (error: any) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message
        })
    }
}

export const getLocationIds = async (req: Request, res: Response) => {
    try {
        const { locationIds } = (req.body || {}) as { locationIds: string[] };

        if (!locationIds || locationIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No location IDs provided",
                data: []
            });
        }

        const locations = await LocationService.getLocationByIds(locationIds);

        return res.status(200).json({
            success: true,
            data: locations
        });

    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};


export const searchServicesByLocationDetails = async (req: Request, res: Response) => {
    try {
        const { query } = req.query as { query?: string };
        const { locationIds } = (req.body || {}) as { locationIds?: string[] };

        let finalLocationIds: string[] = [];
        let locationContext: any = null;

        // Query takes priority
        if (query) {
            locationContext = await LocationService.searchServicesyLocationDetails(query);
            finalLocationIds = locationContext.map((loc: any) => loc._id);
        } else if (locationIds && locationIds.length > 0) {
            finalLocationIds = locationIds
        } else {
            return res.status(400).json({
                success: false,
                message: 'Please provide either a search query or specific location IDs.'
            });
        }

        if (finalLocationIds.length === 0) {
            return res.status(404).json({
                success: true,
                message: "No service available in this location yet",
                data: {
                    services: [],
                    packages: []
                }
            })
        }

        res.status(200).json({
            success: true,
            locationContext: query ? locationContext : "Using provided IDs",
            data: {}
        })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message })
    }
}