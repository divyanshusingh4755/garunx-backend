import { Types } from "mongoose";
import { FAQ } from "../models/faq.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
export class FAQService {
    static ensureValidId(id) {
        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid FAQ ID");
        }
    }
    static async createFaq(faqData) {
        if (!faqData.name?.trim()) {
            throw new Error("Name is required");
        }
        if (!faqData.question?.trim()) {
            throw new Error("Question is required");
        }
        if (!faqData.answer?.trim()) {
            throw new Error("Answer is required");
        }
        const faq = new FAQ(faqData);
        return faq.save();
    }
    static async updateFaq(id, updateData) {
        this.ensureValidId(id);
        const faq = await FAQ.findById(id);
        if (!faq) {
            throw new Error("FAQ not found");
        }
        for (const [field, value] of Object.entries(updateData)) {
            faq.set(field, value);
        }
        return faq.save();
    }
    static async getFaqById(id) {
        this.ensureValidId(id);
        const faq = await FAQ.findById(id).lean();
        if (!faq) {
            throw new Error("FAQ not found");
        }
        return faq;
    }
    static async deleteFaq(id) {
        this.ensureValidId(id);
        const faq = await FAQ.findByIdAndDelete(id);
        if (!faq) {
            throw new Error("FAQ not found");
        }
        return faq;
    }
    static async toggleFaqStatus(id) {
        this.ensureValidId(id);
        const faq = await FAQ.findById(id);
        if (!faq) {
            throw new Error("FAQ not found");
        }
        faq.isActive = !faq.isActive;
        return faq.save();
    }
    static async findFaqs(searchTerm, faqType, limit = 20, page = 1, isActive, sortBy = "displayOrder", sortOrder = "asc") {
        const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const skip = safeLimit * (safePage - 1);
        const query = {};
        if (faqType) {
            query.faqType = faqType;
        }
        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }
        const normalizedSearch = searchTerm?.trim();
        const isTextSearch = Boolean(normalizedSearch && normalizedSearch.length > 4);
        if (normalizedSearch) {
            if (isTextSearch) {
                query.$text = {
                    $search: normalizedSearch,
                };
            }
            else {
                query.name = {
                    $regex: `^${escapeRegex(normalizedSearch)}`,
                    $options: "i",
                };
            }
        }
        const allowedSortFields = new Set([
            "displayOrder",
            "createdAt",
            "updatedAt",
            "name",
            "faqType",
            "isActive",
            "relevance",
        ]);
        const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "displayOrder";
        let projection = {};
        let sortCriteria;
        if (isTextSearch && safeSortBy === "relevance") {
            projection = {
                score: {
                    $meta: "textScore",
                },
            };
            sortCriteria = {
                score: {
                    $meta: "textScore",
                },
            };
        }
        else {
            const actualSortField = safeSortBy === "relevance" ? "displayOrder" : safeSortBy;
            sortCriteria = {
                [actualSortField]: sortOrder === "desc" ? -1 : 1,
            };
            if (actualSortField !== "createdAt") {
                sortCriteria.createdAt = -1;
            }
        }
        try {
            const [data, total] = await Promise.all([
                FAQ.find(query, projection)
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(safeLimit)
                    .lean(),
                FAQ.countDocuments(query),
            ]);
            return {
                data,
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit),
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            throw new Error(`FAQ fetch failed: ${message}`);
        }
    }
}
//# sourceMappingURL=faq.service.js.map