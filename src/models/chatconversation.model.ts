import { model, Schema, type Document, type Types } from "mongoose";

export enum ChatConversationStatus {
  ACTIVE = "ACTIVE",
  CLOSED = "CLOSED",
}

export interface IChatParticipant {
  userId: Types.ObjectId;
  role: "USER" | "COORDINATOR" | "ADMIN";
  lastDeliveredMessageId?: Types.ObjectId;
  lastDeliveredAt?: Date;
  lastReadMessageId?: Types.ObjectId;
  lastReadAt?: Date;
}

export interface IChatConversation extends Document {
  bookingId: Types.ObjectId;
  participants: IChatParticipant[];
  status: ChatConversationStatus;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const participantSchema = new Schema<IChatParticipant>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["USER", "COORDINATOR", "ADMIN"],
      required: true,
    },
    lastDeliveredMessageId: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage"
    },
    lastDeliveredAt: {
      type: Date
    },
    lastReadMessageId: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage"
    },
    lastReadAt: {
      type: Date,
    },
  },
  {
    _id: false,
  },
);

const chatConversationSchema = new Schema<IChatConversation>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      index: true,
    },
    participants: {
      type: [participantSchema],
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ChatConversationStatus),
      default: ChatConversationStatus.ACTIVE,
    },
    lastMessageAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

chatConversationSchema.index({ "participants.userId": 1 });

export const ChatConversation = model<IChatConversation>("ChatConversation", chatConversationSchema);
