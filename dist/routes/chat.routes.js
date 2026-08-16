import { Router } from "express";
import { body, param, query } from "express-validator";
import { validate } from "../utils/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { getByBookingId, getById, markAsRead, } from "../controllers/chatconversation.controllers.js";
import { getMessages, getUnreadCount, sendMessage, uploadChatImages, } from "../controllers/chatmessage.controller.js";
import { ChatMessageType, } from "../models/chatmessage.model.js";
import { chatImageUpload, } from "../middleware/chatImageUpload.js";
import { requireActiveChatParticipant, } from "../middleware/chatParticipant.js";
const router = Router();
const conversationIdValidation = [
    param("conversationId")
        .isMongoId()
        .withMessage("Invalid conversation ID"),
    validate,
];
const bookingIdValidation = [
    param("bookingId")
        .isMongoId()
        .withMessage("Invalid booking ID"),
    validate,
];
const getMessagesValidation = [
    param("conversationId")
        .isMongoId()
        .withMessage("Invalid conversation ID"),
    query("cursor")
        .optional()
        .isMongoId()
        .withMessage("Invalid message cursor"),
    query("limit")
        .optional()
        .isInt({
        min: 1,
        max: 100,
    })
        .withMessage("Limit must be between 1 and 100")
        .toInt(),
    validate,
];
const sendMessageValidation = [
    param("conversationId")
        .isMongoId()
        .withMessage("Invalid conversation ID"),
    body("clientMessageId")
        .exists({
        checkFalsy: true,
    })
        .withMessage("Client message ID is required")
        .bail()
        .isString()
        .withMessage("Client message ID must be string")
        .bail()
        .trim()
        .notEmpty()
        .withMessage("Client message ID cannot be empty")
        .isLength({
        max: 128,
    })
        .withMessage("Client message ID cannot exceed 128 characters"),
    body("type")
        .exists({
        checkFalsy: true,
    })
        .withMessage("Message type is required")
        .bail()
        .isIn([
        ChatMessageType.TEXT,
        ChatMessageType.IMAGE,
    ])
        .withMessage("Message type must be TEXT or IMAGE"),
    body("replyToMessageId")
        .optional()
        .isMongoId()
        .withMessage("Invalid reply message ID"),
    body("text")
        .optional()
        .isString()
        .withMessage("Message text must be a string")
        .trim()
        .isLength({
        max: 5000,
    })
        .withMessage("Message text cannot exceed 5000 characters"),
    body("images")
        .optional()
        .isArray({
        max: 5,
    })
        .withMessage("Images must be an array with maximum 5 images"),
    body("images.*")
        .optional()
        .isString()
        .withMessage("Each image must be a string")
        .bail()
        .trim()
        .isLength({
        min: 1,
        max: 2000,
    })
        .withMessage("Each image URL must be between 1 and 2000 characters")
        .bail()
        .isURL({
        protocols: [
            "http",
            "https",
        ],
        require_protocol: true,
    })
        .withMessage("Each image must be a valid HTTP or HTTPS URL"),
    body().custom((value) => {
        const { type, text, images, } = value ?? {};
        if (type ===
            ChatMessageType.TEXT) {
            if (typeof text !==
                "string" ||
                !text.trim()) {
                throw new Error("Text is required for TEXT message");
            }
            if (Array.isArray(images) &&
                images.length >
                    0) {
                throw new Error("Text message cannot contain images");
            }
        }
        if (type ===
            ChatMessageType.IMAGE) {
            if (!Array.isArray(images) ||
                images.length ===
                    0) {
                throw new Error("At least one image is required for IMAGE message");
            }
        }
        return true;
    }),
    validate,
];
const markAsReadValidation = [
    param("conversationId")
        .isMongoId()
        .withMessage("Invalid conversation ID"),
    body("messageId")
        .isMongoId()
        .withMessage("Invalid message ID"),
    validate,
];
// =========================================================
// BOOKING CONVERSATION LOOKUP
// =========================================================
router.get("/booking/:bookingId", authenticate, bookingIdValidation, getByBookingId);
// =========================================================
// CONVERSATION - MESSAGES
// =========================================================
router.get("/conversation/:conversationId/messages", authenticate, getMessagesValidation, getMessages);
router.post("/conversation/:conversationId/messages", authenticate, sendMessageValidation, sendMessage);
// =========================================================
// CONVERSATION - IMAGE UPLOAD
// =========================================================
router.post("/conversation/:conversationId/images", authenticate, conversationIdValidation, requireActiveChatParticipant, chatImageUpload.array("images", 5), uploadChatImages);
// =========================================================
// CONVERSATION - READ / UNREAD
// =========================================================
router.patch("/conversation/:conversationId/read", authenticate, markAsReadValidation, markAsRead);
router.get("/conversation/:conversationId/unread-count", authenticate, conversationIdValidation, getUnreadCount);
// =========================================================
// GENERIC CONVERSATION DETAIL
//
// Keep this after the more specific
// /conversation/:conversationId/... routes.
// =========================================================
router.get("/conversation/:conversationId", authenticate, conversationIdValidation, getById);
export default router;
//# sourceMappingURL=chat.routes.js.map