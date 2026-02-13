import type { Request, Response } from "express"
import { PricingSerive } from "../services/pricing.service.js"

export const addOrUpdatePricing = async (req: Request, res: Response) => {
    try {
        const pricing = await PricingSerive.upsertServicePrice(req.body)
        res.status(200).json({
            success: true,
            message: "Price updated successfully",
            data: pricing
        })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const getPricesByLocation = async (req: Request, res: Response) => {
    try {
        const { locationIds } = req.body;
        const prices = await PricingSerive.fetchByLocation(locationIds);
        res.status(200).json({
            success: true,
            count: prices.length,
            data: prices
        })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const getPriceDetails = async (req: Request, res: Response) => {
    try {
        const { serviceId, locationId } = req.query;
        if (!serviceId || !locationId) {
            return res.status(400).json({ success: false, message: "ServiceID and locationID are required" })
        }

        const price = await PricingSerive.fetchPriceDetails(serviceId as string, locationId as string)
        if (!price) {
            return res.status(400).json({ success: false, message: "Pricing not found for this selection" })
        }

        res.status(200).json({ success: true, data: price })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const getAllSerivces = async (req: Request, res: Response) => {
    try {
        const services = await PricingSerive.getAllSerivces()
        res.status(200).json({ success: true, data: services })
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message })
    }
}