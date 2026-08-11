import { BannerService } from "../services/banner.service.js";
const getErrorStatus = (error) => {
    if (error instanceof Error && error.message === "Banner not found") {
        return 404;
    }
    return 400;
};
const getErrorMessage = (error, fallback) => {
    return error instanceof Error ? error.message : fallback;
};
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
            displayOrder: displayOrder === undefined ? 0 : displayOrder,
            isActive: isActive === undefined ? true : isActive,
            redirect,
        });
        return res.status(201).json({
            success: true,
            message: "Banner created successfully",
            data: banner,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: getErrorMessage(error, "Failed to create banner"),
        });
    }
};
export const updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await BannerService.updateBanner(id, req.body);
        return res.status(200).json({
            success: true,
            message: "Banner updated successfully",
            data: banner,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to update banner"),
        });
    }
};
export const getBannerById = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await BannerService.getBannerById(id);
        return res.status(200).json({
            success: true,
            data: banner,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch banner"),
        });
    }
};
export const deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;
        await BannerService.deleteBanner(id);
        return res.status(200).json({
            success: true,
            message: "Banner deleted successfully",
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to delete banner"),
        });
    }
};
export const toggleBannerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await BannerService.toggleBannerStatus(id);
        return res.status(200).json({
            success: true,
            message: `Banner ${banner.isActive ? "activated" : "deactivated"} successfully`,
            data: banner,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to update banner status"),
        });
    }
};
export const getAllBanners = async (req, res) => {
    try {
        const { searchTerm, placement, format, redirectType, isActive, limit, page, sortBy, sortOrder, } = req.query;
        const parsedLimit = typeof limit === "number" ? limit : Number(limit);
        const parsedPage = typeof page === "number" ? page : Number(page);
        const result = await BannerService.findBanners(typeof searchTerm === "string" ? searchTerm : undefined, typeof placement === "string" ? placement : undefined, typeof format === "string" ? format : undefined, typeof redirectType === "string"
            ? redirectType
            : undefined, Number.isInteger(parsedLimit) && parsedLimit > 0
            ? Math.min(parsedLimit, 100)
            : 20, Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1, isActive === "true" ? true : isActive === "false" ? false : undefined, typeof sortBy === "string" ? sortBy : "displayOrder", sortOrder === "desc" ? "desc" : "asc");
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch banners"),
        });
    }
};
//# sourceMappingURL=banner.controllers.js.map