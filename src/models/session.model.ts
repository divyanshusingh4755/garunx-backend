import { model, Schema, Types, type Document } from "mongoose";

export interface ISession extends Document {
  userId: Types.ObjectId;
  refreshToken: string;
  deviceInfo?: string;
  ipAddress?: string;
  familyId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    refreshToken: {
      type: String,
      required: true,
    },

    familyId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    deviceInfo: {
      type: String,
      trim: true,
    },

    ipAddress: {
      type: String,
      trim: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Auto-delete the session after its refresh token expires.
sessionSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);

sessionSchema.index({
  userId: 1,
  familyId: 1,
});

export const Session = model<ISession>("Session", sessionSchema);
