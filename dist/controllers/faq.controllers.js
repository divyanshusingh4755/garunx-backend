import { FAQService } from "../services/faq.service.js";
const getErrorMessage = (error, fallback) => {
    return error instanceof Error ? error.message : fallback;
};
const getErrorStatus = (error) => {
    if (error instanceof Error && error.message === "FAQ not found") {
        return 404;
    }
    return 400;
};
export const createFaq = async (req, res) => {
    try {
        const { name, question, answer, faqType, displayOrder, isActive } = req.body;
        const faq = await FAQService.createFaq({
            name,
            question,
            answer,
            faqType,
            displayOrder: displayOrder === undefined ? 0 : displayOrder,
            isActive: isActive === undefined ? true : isActive,
        });
        return res.status(201).json({
            success: true,
            message: "FAQ created successfully",
            data: faq,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: getErrorMessage(error, "Failed to create FAQ"),
        });
    }
};
export const updateFaq = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = {};
        const allowedFields = [
            "name",
            "question",
            "answer",
            "faqType",
            "displayOrder",
            "isActive",
        ];
        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                Object.assign(updateData, {
                    [field]: req.body[field],
                });
            }
        }
        const faq = await FAQService.updateFaq(id, updateData);
        return res.status(200).json({
            success: true,
            message: "FAQ updated successfully",
            data: faq,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to update FAQ"),
        });
    }
};
export const getFaqById = async (req, res) => {
    try {
        const { id } = req.params;
        const faq = await FAQService.getFaqById(id);
        return res.status(200).json({
            success: true,
            data: faq,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch FAQ"),
        });
    }
};
export const deleteFaq = async (req, res) => {
    try {
        const { id } = req.params;
        await FAQService.deleteFaq(id);
        return res.status(200).json({
            success: true,
            message: "FAQ deleted successfully",
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to delete FAQ"),
        });
    }
};
export const toggleFaqStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const faq = await FAQService.toggleFaqStatus(id);
        return res.status(200).json({
            success: true,
            message: `FAQ ${faq.isActive ? "activated" : "deactivated"} successfully`,
            data: faq,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to update FAQ status"),
        });
    }
};
export const getAllFaqs = async (req, res) => {
    try {
        const { searchTerm, faqType, isActive, limit, page, sortBy, sortOrder } = req.query;
        const parsedLimit = typeof limit === "number" ? limit : Number(limit);
        const parsedPage = typeof page === "number" ? page : Number(page);
        const result = await FAQService.findFaqs(typeof searchTerm === "string" ? searchTerm : undefined, typeof faqType === "string" ? faqType : undefined, Number.isInteger(parsedLimit) && parsedLimit > 0
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
            message: getErrorMessage(error, "Failed to fetch FAQs"),
        });
    }
};
//# sourceMappingURL=faq.controllers.js.map