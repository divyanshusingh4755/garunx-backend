import { FAQService } from "../services/faq.service.js";
export const createFaq = async (req, res) => {
    try {
        const { name, question, answer, displayOrder, isActive } = req.body;
        const faq = await FAQService.createFaq({
            name,
            question,
            answer,
            displayOrder: Number(displayOrder) || 0,
            isActive: isActive !== undefined ? isActive : true,
        });
        res.status(201).json({
            success: true,
            message: "FAQ created successfully",
            data: faq,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const updateFaq = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, question, answer, displayOrder, isActive } = req.body;
        const updateData = {
            name,
            question,
            answer,
            isActive,
        };
        if (displayOrder !== undefined) {
            updateData.displayOrder = Number(displayOrder);
        }
        const faq = await FAQService.updateFaq(id, updateData);
        res.status(200).json({
            success: true,
            message: "FAQ updated successfully",
            data: faq,
        });
    }
    catch (error) {
        res.status(error.message === "FAQ not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getFaqById = async (req, res) => {
    try {
        const { id } = req.params;
        const faq = await FAQService.getFaqById(id);
        res.status(200).json({
            success: true,
            data: faq,
        });
    }
    catch (error) {
        res.status(error.message === "FAQ not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const deleteFaq = async (req, res) => {
    try {
        const { id } = req.params;
        await FAQService.deleteFaq(id);
        res.status(200).json({
            success: true,
            message: "FAQ deleted successfully",
        });
    }
    catch (error) {
        res.status(error.message === "FAQ not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const toggleFaqStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const faq = await FAQService.toggleFaqStatus(id);
        res.status(200).json({
            success: true,
            message: `FAQ ${faq.isActive ? "activated" : "deactivated"} successfully`,
            data: faq,
        });
    }
    catch (error) {
        res.status(error.message === "FAQ not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getAllFaqs = async (req, res) => {
    try {
        const { searchTerm, isActive, limit, page, sortBy, sortOrder } = req.query;
        const result = await FAQService.findFaqs(searchTerm, Number(limit) || 20, Number(page) || 1, isActive === "true" ? true : isActive === "false" ? false : undefined, sortBy || "displayOrder", sortOrder || "asc");
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
//# sourceMappingURL=faq.controllers.js.map