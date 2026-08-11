import { Schema, Types, model, type Document, type Model } from "mongoose";

export type UserQueryActivityType =
  | "QUERY_CREATED"
  | "REQUESTER_REPLIED"
  | "ADMIN_REPLIED"
  | "STATUS_CHANGED"
  | "ASSIGNED"
  | "PRIORITY_CHANGED"
  | "CATEGORY_CHANGED"
  | "QUERY_DELETED";

export interface IUserQueryActivity extends Document {
  queryId: Types.ObjectId;
  performedBy: Types.ObjectId;
  type: UserQueryActivityType;
  oldValue?: unknown;
  newValue?: unknown;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userQueryActivitySchema = new Schema<IUserQueryActivity>(
  {
    queryId: {
      type: Schema.Types.ObjectId,
      ref: "UserQuery",
      required: true,
      index: true,
    },

    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "QUERY_CREATED",
        "REQUESTER_REPLIED",
        "ADMIN_REPLIED",
        "STATUS_CHANGED",
        "ASSIGNED",
        "PRIORITY_CHANGED",
        "CATEGORY_CHANGED",
        "QUERY_DELETED",
      ] satisfies UserQueryActivityType[],
      required: true,
      index: true,
    },

    oldValue: {
      type: Schema.Types.Mixed,
    },

    newValue: {
      type: Schema.Types.Mixed,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  },
);

userQueryActivitySchema.index({
  queryId: 1,
  createdAt: -1,
});

userQueryActivitySchema.index({
  queryId: 1,
  type: 1,
  createdAt: -1,
});

export const UserQueryActivity: Model<IUserQueryActivity> =
  model<IUserQueryActivity>("UserQueryActivity", userQueryActivitySchema);
