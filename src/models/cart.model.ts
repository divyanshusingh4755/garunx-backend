import mongoose, { type Document, type Model, Schema, Types } from "mongoose";
import type { ILineTax, ITaxSummary } from "../types/tax.types.js";
import { lineTaxSchema } from "./tax.schema.js";

export type CartStatus = "ACTIVE" | "SCHEDULED" | "CHECKOUT_PENDING" | "CHECKED_OUT" | "EXPIRED" | "CANCELLED" | "DELETED";
export type BookingFor = "MYSELF" | "OTHER";

export interface ICartTaxSummary extends ITaxSummary {
  supplierStateCode?: string;
  placeOfSupplyStateCode?: string;
}

export interface ISelectedComponentItem {
  itemId: Types.ObjectId;
  name: string;
}

export interface ISelectedComponent {
  componentId: Types.ObjectId;
  name: string;
  items: ISelectedComponentItem[];
  priceBeforeDiscount: number;
  discountAmount: number;
  totalPrice: number;
  tax?: ILineTax;
}

export interface ICartSubService {
  subServiceId: Types.ObjectId;
  name: string;
  description: string;
  image?: string;
}

export interface ISelectedService {
  serviceId: Types.ObjectId;
  subServices: ICartSubService[];
  name: string;
  priceBeforeDiscount: number;
  discountAmount: number;
  price: number;
  tax?: ILineTax;
}

export interface IAddonService extends ISelectedService { }

const cartSubServiceSchema = new Schema<ICartSubService>(
  {
    subServiceId: {
      type: Schema.Types.ObjectId,
      ref: "SubServiceComponent",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

export interface ICart extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId | null;
  guestId?: string;
  serviceId?: Types.ObjectId;
  packageId?: Types.ObjectId;
  couponId?: Types.ObjectId;
  couponCode?: string;
  name: string;
  thumbnailImage?: string;
  categoryId: Types.ObjectId;
  tierId: Types.ObjectId;
  tierName: string;
  locationId: Types.ObjectId;
  locationName: string;
  bookingFor: BookingFor;
  customerDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    caste?: string;
    gotra?: string;
  };
  selectedComponents: ISelectedComponent[];
  addonComponents: ISelectedComponent[];
  selectedServices: ISelectedService[];
  addonServices: IAddonService[];
  scheduledAt?: Date;
  schedulingTimezone?: string;
  notes?: string;
  activeBookingId?: Types.ObjectId;
  basePrice: number;
  addonPrice: number;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  taxSummary: ICartTaxSummary;
  status: CartStatus;
  createdAt: Date;
  updatedAt: Date;
  checkedOutAt?: Date;
  checkoutExpiresAt?: Date;
  convertedToBookingAt?: Date;
}

const cartTaxSummarySchema = new Schema<ICartTaxSummary>(
  {
    taxableAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    cgstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    sgstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    igstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalTax: {
      type: Number,
      default: 0,
      min: 0,
    },
    supplierStateCode: {
      type: String,
      trim: true,
      match: /^\d{2}$/,
    },
    placeOfSupplyStateCode: {
      type: String,
      trim: true,
      match: /^\d{2}$/,
    },
  },
  { _id: false },
);

const selectedComponentItemSchema = new Schema<ISelectedComponentItem>(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "ComponentItem",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const selectedComponentSchema = new Schema<ISelectedComponent>(
  {
    componentId: {
      type: Schema.Types.ObjectId,
      ref: "Component",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    items: {
      type: [selectedComponentItemSchema],
      default: [],
    },
    priceBeforeDiscount: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: lineTaxSchema,
      default: undefined,
    },
  },
  { _id: false },
);

const selectedServiceSchema = new Schema<ISelectedService>(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    subServices: {
      type: [cartSubServiceSchema],
      default: [],
    },

    name: {
      type: String,
      required: true,
    },

    priceBeforeDiscount: {
      type: Number,
      required: true,
      min: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    tax: {
      type: lineTaxSchema,
      default: undefined,
    },
  },
  {
    _id: false,
  },
);

const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    guestId: {
      type: String,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      index: true,
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: "Package",
      index: true,
    },
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      index: true,
    },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
    },
    thumbnailImage: String,
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    tierId: {
      type: Schema.Types.ObjectId,
      ref: "Tier",
      required: true,
      index: true,
    },
    tierName: {
      type: String,
      required: true,
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    locationName: {
      type: String,
      required: true,
    },
    bookingFor: {
      type: String,
      enum: ["MYSELF", "OTHER"],
      default: "MYSELF",
      required: true,
    },
    customerDetails: {
      name: String,
      email: {
        type: String,
        lowercase: true,
        trim: true,
      },
      phone: String,
      address: String,
      caste: String,
      gotra: String,
    },
    selectedComponents: {
      type: [selectedComponentSchema],
      default: [],
    },
    selectedServices: {
      type: [selectedServiceSchema],
      default: [],
    },
    addonComponents: {
      type: [selectedComponentSchema],
      default: [],
    },
    addonServices: {
      type: [selectedServiceSchema],
      default: [],
    },
    scheduledAt: {
      type: Date,
      index: true,
    },
    schedulingTimezone: {
      type: String,
      trim: true,
      default: "Asia/Kolkata",
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    activeBookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      unique: true,
      sparse: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    addonPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxSummary: {
      type: cartTaxSummarySchema,
      default: () => ({
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTax: 0,
      }),
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SCHEDULED", "CHECKOUT_PENDING", "CHECKED_OUT", "EXPIRED", "CANCELLED", "DELETED"],
      default: "ACTIVE",
      index: true,
    },
    checkedOutAt: Date,
    checkoutExpiresAt: {
      type: Date,
      index: true,
    },
    convertedToBookingAt: Date,
  },
  { timestamps: true },
);

cartSchema.pre("validate", function () {
  const hasService = Boolean(this.serviceId);
  const hasPackage = Boolean(this.packageId);

  if (hasService === hasPackage) { throw new Error("Cart must contain either serviceId or packageId"); }
});

cartSchema.pre("validate", function () {
  const hasUser = Boolean(this.userId);
  const hasGuest = Boolean(this.guestId);

  if (hasUser === hasGuest) {
    throw new Error(hasUser ? "Cart cannot belong to both user and guest" : "Cart must belong to a user or guest");
  }
});

cartSchema.pre("validate", function () {
  if (Boolean(this.couponId) !== Boolean(this.couponCode)) { throw new Error("couponId and couponCode must be provided together"); }
});

cartSchema.index({ userId: 1, status: 1 });
cartSchema.index({ guestId: 1, status: 1 });
cartSchema.index({ status: 1, checkoutExpiresAt: 1 });

cartSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 86400, partialFilterExpression: {
      status: "ACTIVE", guestId: { $exists: true }, userId: { $exists: false },
    },
  },
);

export const Cart: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);
