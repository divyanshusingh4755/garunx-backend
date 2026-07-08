import { BannerService } from "../services/banner.service.js";
export const createBanner = async (req, res) => {
    try {
        const { name, description, buttonText, placement, format, image, displayOrder, isActive, redirect, } = req.body;
        const banner = await BannerService.createBanner({
            name,
            description,
            buttonText,
            placement,
            format,
            image,
            displayOrder: Number(displayOrder ?? 0),
            isActive: isActive ?? true,
            redirect,
        });
        res.status(201).json({
            success: true,
            message: "Banner created successfully",
            data: banner,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = {
            ...req.body,
        };
        if (updateData.displayOrder !== undefined) {
            updateData.displayOrder = Number(updateData.displayOrder);
        }
        const banner = await BannerService.updateBanner(id, updateData);
        res.status(200).json({
            success: true,
            message: "Banner updated successfully",
            data: banner,
        });
    }
    catch (error) {
        res.status(error.message === "Banner not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getBannerById = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await BannerService.getBannerById(id);
        res.status(200).json({
            success: true,
            data: banner,
        });
    }
    catch (error) {
        res.status(error.message === "Banner not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;
        await BannerService.deleteBanner(id);
        res.status(200).json({
            success: true,
            message: "Banner deleted successfully",
        });
    }
    catch (error) {
        res.status(error.message === "Banner not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const toggleBannerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await BannerService.toggleBannerStatus(id);
        res.status(200).json({
            success: true,
            message: `Banner ${banner.isActive ? "activated" : "deactivated"} successfully`,
            data: banner,
        });
    }
    catch (error) {
        res.status(error.message === "Banner not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getAllBanners = async (req, res) => {
    try {
        const { searchTerm, placement, format, redirectType, isActive, limit, page, sortBy, sortOrder, } = req.query;
        const result = await BannerService.findBanners(searchTerm, placement, format, redirectType, Number(limit) || 20, Number(page) || 1, isActive === "true"
            ? true
            : isActive === "false"
                ? false
                : undefined, sortBy || "displayOrder", sortOrder || "asc");
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
//# sourceMappingURL=banner.controllers.js.map