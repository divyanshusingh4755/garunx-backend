import { CityService } from "../services/city.service.js"
import type { Request, Response } from 'express';

export const createCity = async (req: Request, res: Response) => {
    try {
        const {
            state,
            city,
            image,
            description,
            location } = req.body

        await CityService.createCity(
            state,
            city,
            image,
            description,
            location
        )
        res.status(200).json({ success: true, data: "City created successfully" })
    } catch (error: any) {
        res.status(error.message === "City not found" ? 404 : 400).json({
            success: false,
            message: error.message
        })
    }
}

export const updateCity = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const result = await CityService.updateCity(id as string, req.body)
        res.status(200).json({ success: true, data: result })
    } catch (error: any) {
        res.status(error.message === "City not found" ? 404 : 400).json({
            success: false,
            message: error.message
        })
    }
}

export const getAllCity = async (req: Request, res: Response) => {
    try {
        const {
            searchTerm,
            stateFilter,
            cityFilter,
            limit,
            page
        } = req.query

        const { data, total, page: CurrentPage, totalPages } = await CityService.FindCity(
            searchTerm as string,
            stateFilter as string,
            cityFilter as string,
            Number(limit) || 40,
            Number(page) || 1
        )
        res.status(200).json({ success: true, data, total, CurrentPage, totalPages })
    } catch (error: any) {
        res.status(error.message === "City not found" ? 404 : 400).json({
            success: false,
            message: error.message
        })
    }
}

export const getCityById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const location = await CityService.getCityById(id as string)
        res.status(200).json({ success: true, data: location })
    } catch (error: any) {
        res.status(error.message === "City not found" ? 404 : 400).json({
            success: false,
            message: error.message
        })
    }
}

export const deleteCity = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { status } = req.body

        if (!id || status === undefined) {
            return res.status(400).json({
                success: false,
                message: "User ID and status are required."
            });
        }

        const city = await CityService.softDeleteCity(id as string, status)
        res.status(200).json({
            success: true,
            message: `City marked as ${status}`,
            data: city
        })
    } catch (error: any) {
        res.status(error.message === "City not found" ? 404 : 400).json({
            success: false,
            message: error.message
        })
    }
}
