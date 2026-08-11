import { model, Schema, type Document, type Types } from "mongoose";

export enum ChatMessageType {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  SYSTEM = "SYSTEM",
}

export interface IChatMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  type: ChatMessageType;
  text?: string;
  images: string[];
  clientMessageId: string;
  replyToMessageId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "ChatConversation",
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(ChatMessageType),
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    images: {
      type: [String],
      default: [],
    },
    clientMessageId: {
      type: String,
      required: true,
    },
    replyToMessageId: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
  },
  {
    timestamps: true,
  },
);

chatMessageSchema.index({
  conversationId: 1,
  createdAt: -1,
});

chatMessageSchema.index(
  {
    conversationId: 1,
    senderId: 1,
    clientMessageId: 1,
  },
  {
    unique: true,
  },
);

export const ChatMessage = model<IChatMessage>(
  "ChatMessage",
  chatMessageSchema,
);
