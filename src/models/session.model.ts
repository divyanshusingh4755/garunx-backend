import { model, Schema, Types } from "mongoose";

export interface ISession extends Document {
  userId: Types.ObjectId;
  refreshToken: String;
  deviceInfo?: String;
  ipAddress?: String;
  familyId: string;
  expiresAt: Date;
}

const sessionSchema = new Schema<ISession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  refreshToken: { type: String, required: true },
  familyId: { type: String, required: true, index: true },
  deviceInfo: { type: String },
  ipAddress: { type: String },
  expiresAt: { type: Date, required: true },
});

// Auto delete the document when refresh token expires
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = model<ISession>("Session", sessionSchema);
