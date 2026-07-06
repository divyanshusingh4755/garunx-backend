import type { Request, Response } from "express";
import { FAQService } from "../services/faq.service.js";
import type { IFAQ } from "../models/faq.model.js";

export const createFaq = async (req: Request, res: Response) => {
  try {
    const {
      name,
      question,
      answer,
      faqType,
      displayOrder,
      isActive,
    } = req.body;

    const faq = await FAQService.createFaq({
      name,
      question,
      answer,
      faqType,
      displayOrder: Number(displayOrder ?? 0),
      isActive: isActive ?? true,
    });

    res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      data: faq,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateFaq = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const {
      name,
      question,
      answer,
      faqType,
      displayOrder,
      isActive,
    } = req.body;

    const updateData: Partial<IFAQ> = {
      name,
      question,
      answer,
      faqType,
      isActive,
    };

    if (displayOrder !== undefined) {
      updateData.displayOrder = Number(displayOrder);
    }

    const faq = await FAQService.updateFaq(id as string, updateData);

    res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      data: faq,
    });
  } catch (error: any) {
    res.status(error.message === "FAQ not found" ? 404 : 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getFaqById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const faq = await FAQService.getFaqById(id as string);

    res.status(200).json({
      success: true,
      data: faq,
    });
  } catch (error: any) {
    res.status(error.message === "FAQ not found" ? 404 : 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteFaq = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await FAQService.deleteFaq(id as string);

    res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error: any) {
    res.status(error.message === "FAQ not found" ? 404 : 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const toggleFaqStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const faq = await FAQService.toggleFaqStatus(id as string);

    res.status(200).json({
      success: true,
      message: `FAQ ${faq.isActive ? "activated" : "deactivated"} successfully`,
      data: faq,
    });
  } catch (error: any) {
    res.status(error.message === "FAQ not found" ? 404 : 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllFaqs = async (req: Request, res: Response) => {
  try {
    const {
      searchTerm,
      faqType,
      isActive,
      limit,
      page,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await FAQService.findFaqs(
      searchTerm as string,
      faqType as string,
      Number(limit) || 20,
      Number(page) || 1,
      isActive === "true" ? true : isActive === "false" ? false : undefined,
      (sortBy as string) || "displayOrder",
      (sortOrder as "asc" | "desc") || "asc",
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
