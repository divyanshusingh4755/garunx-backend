import { ChatConversationService } from "../services/chatconversation.service.js";
export const requireActiveChatParticipant = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }
        if (!conversationId || Array.isArray(conversationId)) {
            return res.status(400).json({
                success: false,
                message: "Valid conversation ID is required"
            });
        }
        await ChatConversationService.assertParticipant({ conversationId, userId, requireActive: true });
        next();
    }
    catch (error) {
        return res.status(403).json({
            success: false,
            message: error.message || "Chat access denied"
        });
    }
};
//# sourceMappingURL=chatParticipant.js.map