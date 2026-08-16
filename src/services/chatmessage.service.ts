import mongoose, {
  Types,
} from "mongoose";

import {
  ChatMessage,
  ChatMessageType,
  type IChatMessage,
} from "../models/chatmessage.model.js";

import {
  ChatConversationService,
} from "./chatconversation.service.js";

import {
  ChatConversation,
  ChatConversationStatus,
} from "../models/chatconversation.model.js";

import {
  toChatMessageSocketDto,
} from "../socket/socket.dto.js";
import { ChatPushQueueService } from "./chat-push-queue.service.js";

export interface SendMessageResult {
  message: IChatMessage;
  created: boolean;
}

export class ChatMessageService {
  private static buildPushPreview(params: {
    type: ChatMessageType;
    text?: string;
    imageCount: number;
  }): string {
    const {
      type,
      text,
      imageCount,
    } = params;

    if (
      type ===
      ChatMessageType.TEXT &&
      text
    ) {
      const preview =
        text.trim();

      return preview.length > 140
        ? `${preview.slice(0, 137)}...`
        : preview;
    }

    if (
      type ===
      ChatMessageType.IMAGE
    ) {
      return imageCount > 1
        ? `Sent you ${imageCount} images`
        : "Sent you an image";
    }

    return "You received a new message";
  }

  private static async enqueuePushSafely(params: {
    recipientId: string;
    conversationId: string;
    messageId: string;
    senderId: string;
    type: ChatMessageType;
    text?: string;
    imageCount: number;
  }): Promise<void> {
    try {
      await ChatPushQueueService.enqueue({
        recipientId:
          params.recipientId,

        conversationId:
          params.conversationId,

        messageId:
          params.messageId,

        senderId:
          params.senderId,

        title:
          "New message",

        message:
          this.buildPushPreview({
            type:
              params.type,

            ...(params.text && {
              text:
                params.text,
            }),

            imageCount:
              params.imageCount,
          }),
      });
    } catch (error) {
      /*
       * A chat message has already been persisted.
       * Redis / push failure must not make the sender
       * think the message itself failed.
       */
      console.error(
        `[CHAT PUSH] Failed to enqueue message ${params.messageId}:`,
        error,
      );
    }
  }

  static async sendMessage(params: {
    conversationId: string;
    senderId: string;
    clientMessageId: string;
    type: ChatMessageType;
    text?: string;
    images?: string[];
    replyToMessageId?: string;
  }): Promise<SendMessageResult> {
    const {
      conversationId,
      senderId,
      clientMessageId,
      type,
      text,
      images = [],
      replyToMessageId,
    } = params;

    const normalizedText =
      text?.trim();

    const normalizedClientMessageId =
      clientMessageId?.trim();

    const normalizedImages =
      Array.isArray(images)
        ? images.map((image) =>
          typeof image === "string"
            ? image.trim()
            : image,
        )
        : images;

    if (
      !Types.ObjectId.isValid(
        conversationId,
      )
    ) {
      throw new Error(
        "Invalid conversation ID",
      );
    }

    if (
      !Types.ObjectId.isValid(
        senderId,
      )
    ) {
      throw new Error(
        "Invalid sender ID",
      );
    }

    if (
      replyToMessageId &&
      !Types.ObjectId.isValid(
        replyToMessageId,
      )
    ) {
      throw new Error(
        "Invalid reply message ID",
      );
    }

    if (
      !normalizedClientMessageId
    ) {
      throw new Error(
        "Client message ID is required",
      );
    }

    if (
      normalizedClientMessageId.length >
      128
    ) {
      throw new Error(
        "Client message ID cannot exceed 128 characters",
      );
    }

    if (
      ![
        ChatMessageType.TEXT,
        ChatMessageType.IMAGE,
      ].includes(
        type,
      )
    ) {
      throw new Error(
        "Message type must be TEXT or IMAGE",
      );
    }

    if (
      normalizedText &&
      normalizedText.length >
      5000
    ) {
      throw new Error(
        "Message text cannot exceed 5000 characters",
      );
    }

    if (
      !Array.isArray(
        normalizedImages,
      )
    ) {
      throw new Error(
        "Images must be an array",
      );
    }

    if (
      normalizedImages.length >
      5
    ) {
      throw new Error(
        "Maximum 5 images are allowed per message",
      );
    }

    for (
      const image of
      normalizedImages
    ) {
      if (
        typeof image !== "string" ||
        !image
      ) {
        throw new Error(
          "Each image must be a non-empty URL",
        );
      }

      if (
        image.length >
        2000
      ) {
        throw new Error(
          "Image URL cannot exceed 2000 characters",
        );
      }

      let parsedUrl: URL;

      try {
        parsedUrl =
          new URL(image);
      } catch {
        throw new Error(
          "Each image must be a valid HTTP or HTTPS URL",
        );
      }

      if (
        parsedUrl.protocol !== "http:" &&
        parsedUrl.protocol !== "https:"
      ) {
        throw new Error(
          "Each image must be a valid HTTP or HTTPS URL",
        );
      }
    }

    switch (type) {
      case ChatMessageType.TEXT:
        if (
          !normalizedText
        ) {
          throw new Error(
            "Text message cannot be empty",
          );
        }

        if (
          normalizedImages.length >
          0
        ) {
          throw new Error(
            "Text message cannot contain images",
          );
        }

        break;

      case ChatMessageType.IMAGE:
        if (
          normalizedImages.length ===
          0
        ) {
          throw new Error(
            "Image message must contain at least one image",
          );
        }

        break;
    }

    const conversation =
      await ChatConversationService
        .assertParticipant({
          conversationId,
          userId:
            senderId,
          requireActive:
            true,
        });

    /*
     * Idempotency check.
     *
     * If the client retries the same message,
     * return the existing message and DO NOT
     * enqueue another push.
     */
    const existingMessage =
      await ChatMessage.findOne({
        conversationId:
          conversation._id,

        senderId:
          new Types.ObjectId(
            senderId,
          ),

        clientMessageId:
          normalizedClientMessageId,
      });

    if (
      existingMessage
    ) {
      await ChatConversation.updateOne(
        {
          _id:
            conversation._id,
        },
        {
          $max: {
            lastMessageAt:
              existingMessage.createdAt,
          },
        },
      );

      return {
        message:
          existingMessage,

        created:
          false,
      };
    }

    let replyMessage =
      null;

    if (
      replyToMessageId
    ) {
      replyMessage =
        await ChatMessage.findOne({
          _id:
            new Types.ObjectId(
              replyToMessageId,
            ),

          conversationId:
            conversation._id,
        });

      if (
        !replyMessage
      ) {
        throw new Error(
          "Reply message not found in this conversation",
        );
      }
    }

    const messageData:
      Record<string, any> = {
      conversationId:
        conversation._id,

      senderId:
        new Types.ObjectId(
          senderId,
        ),

      type,

      clientMessageId:
        normalizedClientMessageId,
    };

    if (
      normalizedText
    ) {
      messageData.text =
        normalizedText;
    }

    if (
      normalizedImages.length >
      0
    ) {
      messageData.images =
        normalizedImages;
    }

    if (
      replyToMessageId
    ) {
      messageData.replyToMessageId =
        new Types.ObjectId(
          replyToMessageId,
        );
    }

    let createdMessage:
      IChatMessage | null = null;

    const session =
      await mongoose.startSession();

    try {
      try {
        await session.withTransaction(
          async () => {
            const createdMessages =
              await ChatMessage.create(
                [
                  messageData,
                ],
                {
                  session,
                },
              );

            const message =
              createdMessages[0];

            if (!message) {
              throw new Error(
                "Message creation failed",
              );
            }

            /*
             * Message creation + conversation timestamp update are atomic.
             *
             * $max also prevents lastMessageAt from moving backwards if two
             * messages are created concurrently.
             */
            const conversationUpdate =
              await ChatConversation.updateOne(
                {
                  _id:
                    conversation._id,

                  status:
                    ChatConversationStatus.ACTIVE,

                  "participants.userId":
                    new Types.ObjectId(
                      senderId,
                    ),
                },
                {
                  $max: {
                    lastMessageAt:
                      message.createdAt,
                  },
                },
                {
                  session,
                },
              );

            if (
              conversationUpdate.matchedCount ===
              0
            ) {
              throw new Error(
                "Active chat conversation not found or access denied",
              );
            }

            createdMessage =
              message;
          },
        );
      } catch (
      error: any
      ) {
        if (
          error?.code ===
          11000
        ) {
          const existingMessage =
            await ChatMessage.findOne({
              conversationId:
                conversation._id,

              senderId:
                new Types.ObjectId(
                  senderId,
                ),

              clientMessageId:
                normalizedClientMessageId,
            });

          if (
            existingMessage
          ) {
            /*
             * Repair lastMessageAt as well. This covers a retry of a message
             * created by another concurrent request.
             */
            await ChatConversation.updateOne(
              {
                _id:
                  conversation._id,
              },
              {
                $max: {
                  lastMessageAt:
                    existingMessage.createdAt,
                },
              },
            );

            return {
              message:
                existingMessage,

              created:
                false,
            };
          }
        }

        throw error;
      }
    } finally {
      await session.endSession();
    }

    if (!createdMessage) {
      throw new Error(
        "Message creation failed",
      );
    }

    const message =
      createdMessage as IChatMessage;

    const recipient =
      conversation.participants
        .find(
          (
            participant,
          ) =>
            participant.userId
              .toString() !==
            senderId,
        );

    if (
      recipient
    ) {
      await this
        .enqueuePushSafely({
          recipientId:
            recipient.userId
              .toString(),

          conversationId:
            conversation._id
              .toString(),

          messageId:
            message._id
              .toString(),

          senderId,

          type,

          ...(normalizedText && {
            text:
              normalizedText,
          }),

          imageCount:
            normalizedImages.length,
        });
    } else {
      console.error(
        `[CHAT PUSH] Recipient not found for conversation ${conversation._id.toString()}`,
      );
    }

    return {
      message,

      created:
        true,
    };
  }

  static async getMessages(params: {
    conversationId: string;
    requestedBy: string;
    cursor?: string;
    limit?: number;
  }) {
    const {
      conversationId,
      requestedBy,
      cursor,
      limit = 30,
    } = params;

    if (
      !Types.ObjectId.isValid(
        conversationId,
      )
    ) {
      throw new Error(
        "Invalid conversation ID",
      );
    }

    if (
      !Types.ObjectId.isValid(
        requestedBy,
      )
    ) {
      throw new Error(
        "Invalid user ID",
      );
    }

    const conversation =
      await ChatConversationService
        .assertParticipant({
          conversationId,
          userId:
            requestedBy,
        });

    const otherParticipant =
      conversation.participants
        .find(
          (
            participant,
          ) =>
            participant.userId
              .toString() !==
            requestedBy,
        );

    let lastDeliveredMessage:
      IChatMessage | null = null;

    let lastReadMessage:
      IChatMessage | null = null;

    if (
      otherParticipant
        ?.lastDeliveredMessageId
    ) {
      lastDeliveredMessage =
        await ChatMessage.findOne({
          _id:
            otherParticipant
              .lastDeliveredMessageId,

          conversationId:
            new Types.ObjectId(
              conversationId,
            ),
        });
    }

    if (
      otherParticipant
        ?.lastReadMessageId
    ) {
      lastReadMessage =
        await ChatMessage.findOne({
          _id:
            otherParticipant
              .lastReadMessageId,

          conversationId:
            new Types.ObjectId(
              conversationId,
            ),
        });
    }

    const safeLimit =
      Number.isInteger(
        limit,
      ) &&
        limit > 0
        ? Math.min(
          limit,
          100,
        )
        : 30;

    const query:
      Record<string, any> = {
      conversationId:
        new Types.ObjectId(
          conversationId,
        ),
    };

    if (
      cursor
    ) {
      if (
        !Types.ObjectId.isValid(
          cursor,
        )
      ) {
        throw new Error(
          "Invalid message cursor",
        );
      }

      const cursorMessage =
        await ChatMessage.findOne({
          _id:
            new Types.ObjectId(
              cursor,
            ),

          conversationId:
            new Types.ObjectId(
              conversationId,
            ),
        }).select({
          _id: 1,
          createdAt: 1,
        });

      if (
        !cursorMessage
      ) {
        throw new Error(
          "Message cursor not found",
        );
      }

      query.$or = [
        {
          createdAt: {
            $lt:
              cursorMessage.createdAt,
          },
        },
        {
          createdAt:
            cursorMessage.createdAt,

          _id: {
            $lt:
              cursorMessage._id,
          },
        },
      ];
    }

    const messages =
      await ChatMessage
        .find(
          query,
        )
        .sort({
          createdAt:
            -1,

          _id:
            -1,
        })
        .limit(
          safeLimit +
          1,
        );

    const hasMore =
      messages.length >
      safeLimit;

    const result =
      hasMore
        ? messages.slice(
          0,
          safeLimit,
        )
        : messages;

    const nextCursor =
      hasMore &&
        result.length > 0
        ? result[
          result.length - 1
        ]?._id.toString() ??
        null
        : null;

    const replyMessageIds =
      result
        .map(
          (
            message,
          ) =>
            message
              .replyToMessageId,
        )
        .filter(
          (
            messageId,
          ): messageId is Types.ObjectId =>
            Boolean(
              messageId,
            ),
        );

    const replyMessages =
      replyMessageIds.length >
        0
        ? await ChatMessage
          .find({
            _id: {
              $in:
                replyMessageIds,
            },

            conversationId:
              new Types.ObjectId(
                conversationId,
              ),
          })
        : [];

    const replyMessageMap =
      new Map<
        string,
        IChatMessage
      >(
        replyMessages.map(
          (
            message,
          ) => [
              message._id
                .toString(),
              message,
            ],
        ),
      );

    const formattedMessages =
      result.map(
        (
          message,
        ) => {
          const replyMessage =
            message.replyToMessageId
              ? replyMessageMap.get(
                message
                  .replyToMessageId
                  .toString(),
              ) ??
              null
              : null;

          if (
            message.senderId
              .toString() ===
            requestedBy
          ) {
            return toChatMessageSocketDto(
              message,
              {
                lastDeliveredMessage,
                lastReadMessage,
                replyMessage,
                includeDeliveryStatus:
                  true,
              },
            );
          }

          return toChatMessageSocketDto(
            message,
            {
              replyMessage,
            },
          );
        },
      );

    return {
      messages:
        formattedMessages,

      nextCursor,

      hasMore,
    };
  }

  static async getUnreadCount(params: {
    conversationId: string;
    userId: string;
  }) {
    const {
      conversationId,
      userId,
    } = params;

    if (
      !Types.ObjectId.isValid(
        conversationId,
      )
    ) {
      throw new Error(
        "Invalid conversation ID",
      );
    }

    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new Error(
        "Invalid user ID",
      );
    }

    const conversation =
      await ChatConversationService
        .assertParticipant({
          conversationId,
          userId,
        });

    const participant =
      conversation.participants
        .find(
          (
            participant,
          ) =>
            participant.userId
              .toString() ===
            userId,
        );

    if (
      !participant
    ) {
      throw new Error(
        "Chat participant not found",
      );
    }

    const query:
      Record<string, any> = {
      conversationId:
        new Types.ObjectId(
          conversationId,
        ),

      senderId: {
        $ne:
          new Types.ObjectId(
            userId,
          ),
      },
    };

    if (
      participant
        .lastReadMessageId
    ) {
      const lastReadMessage =
        await ChatMessage.findOne({
          _id:
            participant
              .lastReadMessageId,

          conversationId:
            new Types.ObjectId(
              conversationId,
            ),
        }).select({
          _id: 1,
          createdAt: 1,
        });

      if (
        lastReadMessage
      ) {
        query.$or = [
          {
            createdAt: {
              $gt:
                lastReadMessage
                  .createdAt,
            },
          },
          {
            createdAt:
              lastReadMessage
                .createdAt,

            _id: {
              $gt:
                lastReadMessage
                  ._id,
            },
          },
        ];
      }
    }

    return ChatMessage
      .countDocuments(
        query,
      );
  }
}