import { LocationService } from "../services/location.service.js";
import { PricingSerive } from '../services/pricing.service.js';
import { PackageService } from '../services/package.service.js';
export const createLocation = async (req, res) => {
    try {
        const { name, country, state, city, fullAddress, pincode, image, description, location } = req.body;
        await LocationService.createLocation(name, country, state, city, fullAddress, pincode, image, description, location);
        res.status(200).json({ success: true, data: "Location created successfully" });
    }
    catch (error) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
export const updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await LocationService.updateLocation(id, req.body);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
export const getAllLocation = async (req, res) => {
    try {
        const { searchTerm, countryFilter, stateFilter, cityFilter, pincodeFilter, limit, page } = req.query;
        const { data, total, page: CurrentPage, totalPages } = await LocationService.FindLocation(searchTerm, countryFilter, stateFilter, cityFilter, pincodeFilter, Number(limit) || 40, Number(page) || 1);
        res.status(200).json({ success: true, data, total, CurrentPage, totalPages });
    }
    catch (error) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
export const getLocationById = async (req, res) => {
    try {
        const { id } = req.params;
        const location = await LocationService.getLocationById(id);
        res.status(200).json({ success: true, data: location });
    }
    catch (error) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
export const deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const location = await LocationService.softDeleteLocation(id);
        res.status(200).json({ success: true, data: location });
    }
    catch (error) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
export const searchServicesByLocationDetails = async (req, res) => {
    try {
        const { query } = req.query;
        const { locationIds } = (req.body || {});
        let finalLocationIds = [];
        let locationContext = null;
        // Query takes priority
        if (query) {
            locationContext = await LocationService.searchServicesyLocationDetails(query);
            finalLocationIds = locationContext.map((loc) => loc._id);
        }
        else if (locationIds && locationIds.length > 0) {
            finalLocationIds = locationIds;
        }
        else {
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
            });
        }
        const [services, packages] = await Promise.all([
            PricingSerive.fetchByLocation(finalLocationIds),
            PackageService.fetchByLocation(finalLocationIds)
        ]);
        res.status(200).json({
            success: true,
            locationContext: query ? locationContext : "Using provided IDs",
            data: {
                services,
                packages
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
//# sourceMappingURL=location.controllers.js.map