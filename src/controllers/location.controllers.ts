import type { Request, Response } from 'express';
import { LocationService } from "../services/location.service.js"

export const createLocation = async (req: Request, res: Response) => {
    try {
        const {
            country,
            state,
            city,
            fullAddress,
            pincode,
            image,
            description,
            location } = req.body

        await LocationService.createLocation(
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
            page
        } = req.query

        const { data, total, page: CurrentPage, totalPages } = await LocationService.FindLocation(
            searchTerm as string,
            countryFilter as string,
            stateFilter as string,
            cityFilter as string,
            pincodeFilter as string,
            Number(limit) || 40,
            Number(page) || 1
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
        const location = await LocationService.softDeleteLocation(id as string)
        res.status(200).json({ success: true, data: location })
    } catch (error: any) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message
        })
    }
} 