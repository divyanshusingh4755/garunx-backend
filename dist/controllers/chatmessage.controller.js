import { ChatMessageService } from "../services/chatmessage.service.js";
export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { cursor, limit } = req.query;
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
        const result = await ChatMessageService.getMessages({
            conversationId,
            requestedBy,
            ...(typeof cursor === "string" ? { cursor } : {}),
            ...(typeof limit === "string" ? { limit: Number(limit) } : {})
        });
        return res.status(200).json({
            success: true,
            message: "Chat messages fetched successfully",
            data: result
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to get messages"
        });
    }
};
export const sendMessage = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { clientMessageId, type, text, images, replyToMessageId } = req.body;
        const senderId = req.user?.userId;
        if (!senderId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        if (!conversationId || Array.isArray(conversationId)) {
            return res.status(400).json({
                success: false,
                message: "Valid conversation ID is required",
            });
        }
        const { message } = await ChatMessageService.sendMessage({
            conversationId,
            senderId,
            clientMessageId,
            type: type,
            text,
            images,
            replyToMessageId
        });
        return res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: message
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to send messages"
        });
    }
};
export const getUnreadCount = async (req, res) => {
    try {
        const { conversationId } = req.params;
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
        const unreadCount = await ChatMessageService.getUnreadCount({
            conversationId,
            userId
        });
        return res.status(200).json({
            success: true,
            message: "Unread message count fetched successfully",
            data: {
                unreadCount
            }
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to send messages"
        });
    }
};
export const uploadChatImages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        if (!conversationId || Array.isArray(conversationId)) {
            return res.status(400).json({
                success: false,
                message: "Valid conversation ID is required"
            });
        }
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one image is required"
            });
        }
        const images = files.map((file) => file.location);
        return res.status(201).json({
            success: true,
            message: "Chat images uploaded successfully",
            data: {
                images
            }
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to upload chat images"
        });
    }
};
//# sourceMappingURL=chatmessage.controller.js.map