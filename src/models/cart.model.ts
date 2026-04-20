import mongoose, { Model } from "mongoose";
import { Schema } from "mongoose";

export interface ICartItem {
  targetId: string;
  itemType: "SERVICE" | "PACKAGE";
  selectedVariantIds: string[];
  itemKey: string;
}

export interface ICart extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId | null;
  customerDetails: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    caste?: string;
    gotra?: string;
  };
  scheduledDate: Date;
  notes?: string;
  activeBookingId?: string;
  items: ICartItem;
  updatedAt: Date;
  createdAt: Date;
}

const cartSchema: Schema<ICart> = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    customerDetails: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
      address: { type: String },
      caste: { type: String },
      gotra: { type: String },
    },
    activeBookingId: {
      type: String,
      ref: "Booking",
    },
    scheduledDate: { type: Date },
    notes: { type: String },
    items: {
      targetId: { type: String, required: true },
      itemType: {
        type: String,
        enum: ["SERVICE", "PACKAGE"],
        required: true,
      },
      selectedVariantIds: {
        type: [String],
        default: [],
      },
      itemKey: {
        type: String,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

cartSchema.index({ userId: 1, "items.itemKey": 1 });

export const Cart: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);
