import type { Request, Response } from "express";

import { FAQService } from "../services/faq.service.js";
import type { IFAQ } from "../models/faq.model.js";

type FaqUpdateData = Partial<
  Pick<IFAQ, "name" | "question" | "answer" | "faqType" | "displayOrder">
>;

const getErrorMessage = (error: unknown, fallback: string): string => { return error instanceof Error ? error.message : fallback; };

const getErrorStatus = (error: unknown): number => {
  if (error instanceof Error && error.message === "FAQ not found") { return 404; }
  return 400;
};

export const createFaq = async (req: Request, res: Response) => {
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
  } catch (error: unknown) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error, "Failed to create FAQ"),
    });
  }
};

export const updateFaq = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: FaqUpdateData = {};

    const allowedFields = ["name", "question", "answer", "faqType", "displayOrder", "isActive"] as const;

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        Object.assign(updateData, { [field]: req.body[field] });
      }
    }

    const faq = await FAQService.updateFaq(id as string, updateData);

    return res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      data: faq,
    });
  } catch (error: unknown) {
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Failed to update FAQ"),
    });
  }
};

export const getFaqById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const faq = await FAQService.getFaqById(id as string);

    return res.status(200).json({
      success: true,
      data: faq,
    });
  } catch (error: unknown) {
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Failed to fetch FAQ"),
    });
  }
};

export const deleteFaq = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await FAQService.deleteFaq(id as string);

    return res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error: unknown) {
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Failed to delete FAQ"),
    });
  }
};

export const toggleFaqStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const faq = await FAQService.toggleFaqStatus(id as string);

    return res.status(200).json({
      success: true,
      message: `FAQ ${faq.isActive ? "activated" : "deactivated"} successfully`,
      data: faq,
    });
  } catch (error: unknown) {
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Failed to update FAQ status"),
    });
  }
};

export const getAllFaqs = async (req: Request, res: Response) => {
  try {
    const { searchTerm, faqType, isActive, limit, page, sortBy, sortOrder } = req.query;
    const parsedLimit = typeof limit === "number" ? limit : Number(limit);
    const parsedPage = typeof page === "number" ? page : Number(page);

    const result = await FAQService.findFaqs(
      typeof searchTerm === "string" ? searchTerm : undefined,
      typeof faqType === "string" ? faqType : undefined,
      Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20,
      Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
      isActive === "true" ? true : isActive === "false" ? false : undefined,
      typeof sortBy === "string" ? sortBy : "displayOrder",
      sortOrder === "desc" ? "desc" : "asc",
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error, "Failed to fetch FAQs"),
    });
  }
};

export const getPublicFaqs = async (req: Request, res: Response) => {
  try {
    const { searchTerm, faqType, limit, page, sortBy, sortOrder } = req.query;

    const parsedLimit = Number(limit);
    const parsedPage = Number(page);

    const result = await FAQService.findFaqs(
      typeof searchTerm === "string" ? searchTerm : undefined,
      typeof faqType === "string" ? faqType : undefined,
      Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20,
      Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
      true,
      typeof sortBy === "string" ? sortBy : "displayOrder",
      sortOrder === "desc" ? "desc" : "asc",
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error, "Failed to fetch FAQs"),
    });
  }
};

export const exportFaqsCsv = async (req: Request, res: Response) => {
  try {
    const { faqIds }: { faqIds: string[] } = req.body;
    const result = await FAQService.exportFaqsToCsv(faqIds);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="faqs-${timestamp}.csv"`);
    return res.status(200).send(result.csv);
  } catch (error: unknown) {
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Failed to export FAQs"),
    });
  }
};