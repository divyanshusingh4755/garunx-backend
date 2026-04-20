import { model, Schema, Types, Document } from "mongoose";
import { Counter } from "./Counter.js";

export interface IBooking extends Document {
  customerId: Types.ObjectId;
  subAdminId?: Types.ObjectId;
  items: {
    targetId: Types.ObjectId;
    productName: string;
    itemType: "SERVICE" | "PACKAGE";
    description?: string;
    imageUrl?: string;
    categoryName?: string;
    priceAtBooking: number;
    selectedVariants: {
      variantId: Types.ObjectId;
      tier: string;
      price: number;
      location: string;
    }[];
  };
  location: string;
  bookedBy: string;

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

  pricing: {
    basePrice: number;
    discount: number;
    finalPrice: number;
    earnings: number;
  };

  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  paymentStatus: "Pending" | "Paid" | "Refunded";
  transactionId?: string;
  bookingReference: string;
}

const bookingSchema = new Schema<IBooking>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subAdminId: { type: Schema.Types.ObjectId, ref: "User", index: true },

    items: {
      targetId: { type: Schema.Types.ObjectId, required: true },
      productName: { type: String, required: true },
      description: { type: String },
      imageUrl: { type: String },
      categoryName: { type: String },
      itemType: {
        type: String,
        enum: ["SERVICE", "PACKAGE"],
        required: true,
      },
      priceAtBooking: { type: Number, required: true },
      selectedVariants: [
        {
          variantId: { type: Schema.Types.ObjectId, required: true },
          tier: { type: String, required: true },
          price: { type: Number, required: true },
          location: { type: String, required: true },
        },
      ],
    },

    location: { type: String, required: true },
    bookedBy: { type: String, required: true },

    customerDetails: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
      address: { type: String },
      caste: { type: String },
      gotra: { type: String },
    },

    scheduledDate: { type: Date },
    notes: { type: String },

    pricing: {
      basePrice: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      finalPrice: { type: Number, required: true },
      earnings: { type: Number, required: true },
    },

    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
      default: "Pending",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Refunded"],
      default: "Pending",
    },
    transactionId: { type: String },
    bookingReference: {
      type: String,
      unique: true,
      index: true,
    },
  },
  { timestamps: true },
);

bookingSchema.pre("save", async function (this: IBooking) {
  if (!this.isNew) return;

  try {
    const counter = await Counter.findOneAndUpdate(
      { id: "bookingId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );

    if (counter) {
      const seqString = counter.seq.toString().padStart(4, "0");
      this.bookingReference = `BK-${seqString}`;
    }
  } catch (error: any) {
    throw error;
  }
});

bookingSchema.index({ scheduledDate: 1, status: 1 });

export const Booking = model<IBooking>("Booking", bookingSchema);
