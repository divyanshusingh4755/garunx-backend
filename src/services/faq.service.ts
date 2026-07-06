import { FAQ, type IFAQ } from "../models/faq.model.js";

export class FAQService {
  static async createFaq(faqData: Partial<IFAQ>) {
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

  static async updateFaq(id: string, updateData: Partial<IFAQ>) {
    const faq = await FAQ.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!faq) {
      throw new Error("FAQ not found");
    }

    return faq;
  }

  static async getFaqById(id: string) {
    const faq = await FAQ.findById(id).lean();

    if (!faq) {
      throw new Error("FAQ not found");
    }

    return faq;
  }

  static async deleteFaq(id: string) {
    const faq = await FAQ.findByIdAndDelete(id);

    if (!faq) {
      throw new Error("FAQ not found");
    }

    return faq;
  }

  static async toggleFaqStatus(id: string) {
    const faq = await FAQ.findById(id);

    if (!faq) {
      throw new Error("FAQ not found");
    }

    faq.isActive = !faq.isActive;

    await faq.save();

    return faq;
  }

  static async findFaqs(
    searchTerm?: string,
    faqType?: string,
    limit: number = 20,
    page: number = 1,
    isActive?: boolean,
    sortBy: string = "displayOrder",
    sortOrder: "asc" | "desc" = "asc",
  ) {
    const skip = limit * (page - 1);

    const query: any = {};

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

    const sortCriteria: any = {};
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
    } catch (error: any) {
      throw new Error(`FAQ fetch failed: ${error.message}`);
    }
  }
}
