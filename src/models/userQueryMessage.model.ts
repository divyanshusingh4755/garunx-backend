import {
  Schema,
  Types,
  model,
  type Document,
  type Model,
} from "mongoose";

export type QueryMessageSenderType =
  | "USER"
  | "COORDINATOR"
  | "ADMIN";

export interface IUserQueryMessage
  extends Document {
  queryId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderType:
    QueryMessageSenderType;
  message?: string;
  imageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userQueryMessageSchema =
  new Schema<IUserQueryMessage>(
    {
      queryId: {
        type: Schema.Types.ObjectId,
        ref: "UserQuery",
        required: true,
        index: true,
      },

      senderId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      senderType: {
        type: String,
        enum: [
          "USER",
          "COORDINATOR",
          "ADMIN",
        ] satisfies QueryMessageSenderType[],
        required: true,
        index: true,
      },

      message: {
        type: String,
        trim: true,
        maxlength: 2000,
      },

      imageUrls: {
        type: [
          {
            type: String,
            trim: true,
            maxlength: 2000,
          },
        ],
        default: [],
        validate: {
          validator: (
            value: string[],
          ) =>
            Array.isArray(value) &&
            value.length <= 5,
          message:
            "A maximum of 5 images is allowed",
        },
      },
    },
    {
      timestamps: true,
    },
  );

userQueryMessageSchema.pre(
  "validate",
  function () {
    const hasMessage =
      typeof this.message === "string" &&
      this.message.trim().length > 0;

    const hasImages =
      Array.isArray(this.imageUrls) &&
      this.imageUrls.length > 0;

    if (!hasMessage && !hasImages) {
      throw new Error(
        "Message or at least one image is required",
      );
    }
  },
);

userQueryMessageSchema.index({
  queryId: 1,
  createdAt: 1,
});

export const UserQueryMessage:
  Model<IUserQueryMessage> =
    model<IUserQueryMessage>(
      "UserQueryMessage",
      userQueryMessageSchema,
    );
