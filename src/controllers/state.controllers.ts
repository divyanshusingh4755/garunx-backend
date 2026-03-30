import type { Request, Response } from 'express';
import { StateService } from "../services/state.service.js"

export const createState = async (req: Request, res: Response) => {
    try {
        const {
            state,
            country,
            image,
            description,
            location } = req.body

        await StateService.createState(
            state,
            country,
            image,
            description,
            location
        )
        res.status(200).json({ success: true, data: "State created successfully" })
    } catch (error: any) {
        res.status(error.message === "State not found" ? 404 : 400).json({
            success: false,
            message: error.message
        })
    }
}

export const updateState = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const result = await StateService.updateState(id as string, req.body)
        res.status(200).json({ success: true, data: result })
    } catch (error: any) {
        res.status(error.message === "State not found" ? 404 : 400).json({
            success: false,
            message: error.message
        })
    }
}

export const getAllState = async (req: Request, res: Response) => {
    try {
        const {
            searchTerm,
            stateFilter,
            countryFilter,
            limit,
            page,
            isActive,
            sortBy,
            sortOrder
        } = req.query

        const { data, total, page: CurrentPage, totalPages } = await StateService.FindState(
            searchTerm as string,
            stateFilter as string,
            countryFilter as string,
            Number(limit) || 40,
            Number(page) || 1,
            isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            (sortBy as string) || 'state',
            (sortOrder as 'asc' | 'desc') || 'asc'
        )
        res.status(200).json({ success: true, data, total, CurrentPage, totalPages })
    } catch (error: any) {
        res.status(error.message === "State not found" ? 404 : 400).json({
            success: false,
            message: error.message
        })
    }
}

export const getStateById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const location = await StateService.getStateById(id as string)
        res.status(200).json({ success: true, data: location })
    } catch (error: any) {
        res.status(error.message === "State not found" ? 404 : 400).json({
            success: false,
            message: error.message
        })
    }
}

export const deleteState = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { status } = req.body

        if (!id || status === undefined) {
            return res.status(400).json({
                success: false,
                message: "User ID and status are required."
            });
        }

        const state = await StateService.softDeleteState(id as string, status)
        res.status(200).json({
            success: true,
            message: `State marked as ${status}`,
            data: state
        })
    } catch (error: any) {
        res.status(error.message === "State not found" ? 404 : 400).json({
            success: false,
            message: error.message
        })
    }
}