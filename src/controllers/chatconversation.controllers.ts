import type { Request, Response } from "express";
import { ChatConversationService } from "../services/chatconversation.service.js";

export const getByBookingId = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const requestedBy = req.user?.userId;

    if (!requestedBy) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!bookingId || Array.isArray(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Valid booking ID is required",
      });
    }

    const conversation = await ChatConversationService.getByBookingId({ bookingId, requestedBy });

    return res.status(200).json({
      success: true,
      message: "Chat conversation fetched successfully",
      data: conversation
    })
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch chat conversation",
    });
  }
}

export const getById = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const requestedBy = req.user?.userId;

    if (!requestedBy) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!conversationId || Array.isArray(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Valid conversation ID is required",
      });
    }

    const conversation = await ChatConversationService.getById({
      conversationId,
      requestedBy
    })

    return res.status(200).json({
      success: true,
      message: "Chat conversation fetched successfully",
      data: conversation
    })
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch chat conversation",
    });
  }
}

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { messageId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!conversationId || Array.isArray(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Valid conversation ID is required",
      });
    }

    const conversation = await ChatConversationService.markAsRead({ conversationId, userId, messageId })

    return res.status(200).json({
      success: true,
      message: "Conversation marked as read",
      data: conversation
    })
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch chat conversation",
    });
  }
}

export const closeConversation = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    if (!conversationId || Array.isArray(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Valid conversation ID is required",
      });
    }

    const conversation = await ChatConversationService.closeConversation({
      conversationId
    })

    return res.status(200).json({
      success: true,
      message: "Chat conversation closed successfully",
      data: conversation
    })
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to close chat conversation"
    })
  }
}
