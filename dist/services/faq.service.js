import { FAQ } from "../models/faq.model.js";
export class FAQService {
    static async createFaq(faqData) {
        if (!faqData.name) {
            throw new Error("Name is required");
        }
        if (!faqData.question) {
            throw new Error("Question is required");
        }
        if (!faqData.answer) {
            throw new Error("Answer is required");
        }
        const faq = new FAQ(faqData);
        return await faq.save();
    }
    static async updateFaq(id, updateData) {
        const faq = await FAQ.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
        if (!faq) {
            throw new Error("FAQ not found");
        }
        return faq;
    }
    static async getFaqById(id) {
        const faq = await FAQ.findById(id).lean();
        if (!faq) {
            throw new Error("FAQ not found");
        }
        return faq;
    }
    static async deleteFaq(id) {
        const faq = await FAQ.findByIdAndDelete(id);
        if (!faq) {
            throw new Error("FAQ not found");
        }
        return faq;
    }
    static async toggleFaqStatus(id) {
        const faq = await FAQ.findById(id);
        if (!faq) {
            throw new Error("FAQ not found");
        }
        faq.isActive = !faq.isActive;
        await faq.save();
        return faq;
    }
    static async findFaqs(searchTerm, faqType, limit = 20, page = 1, isActive, sortBy = "displayOrder", sortOrder = "asc") {
        const skip = limit * (page - 1);
        const query = {};
        if (faqType) {
            query.faqType = faqType;
        }
        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }
        if (searchTerm) {
            query.$or = [
                { name: { $regex: searchTerm, $options: "i" } },
                { question: { $regex: searchTerm, $options: "i" } },
                { answer: { $regex: searchTerm, $options: "i" } },
            ];
        }
        const sortCriteria = {};
        sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
        if (sortBy !== "createdAt") {
            sortCriteria.createdAt = -1;
        }
        try {
            const [data, total] = await Promise.all([
                FAQ.find(query).sort(sortCriteria).skip(skip).limit(limit).lean(),
                FAQ.countDocuments(query),
            ]);
            return {
                data,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            throw new Error(`FAQ fetch failed: ${error.message}`);
        }
    }
}
//# sourceMappingURL=faq.service.js.map