import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type CartStatus =
  | "ACTIVE"
  | "SCHEDULED"
  | "CHECKOUT_PENDING"
  | "CHECKED_OUT"
  | "EXPIRED"
  | "CANCELLED"
  | "DELETED";

export interface ISelectedComponentItem {
  itemId: Types.ObjectId;
  name: string;
}

export interface ISelectedComponent {
  componentId: Types.ObjectId;
  name: string;
  items: ISelectedComponentItem[];
  totalPrice: number;
}

export interface ISelectedService {
  serviceId: Types.ObjectId;
  name: string;
  price: number;
}

export interface IAddonService {
  serviceId: Types.ObjectId;
  name: string;
  price: number;
}

export interface ICart extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId | null;
  guestId?: string;
  serviceId?: Types.ObjectId;
  packageId?: Types.ObjectId;
  couponId?: Types.ObjectId | undefined;
  couponCode?: string | undefined;
  name: string;
  thumbnailImage?: string;
  categoryId: Types.ObjectId;
  tierId: Types.ObjectId;
  tierName: string;
  locationId: Types.ObjectId;
  locationName: string;
  customerDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    caste?: string;
    gotra?: string;
  };
  selectedComponents?: ISelectedComponent[];
  addonComponents?: ISelectedComponent[];
  selectedServices?: ISelectedService[];
  addonServices?: IAddonService[];
  scheduledDate?: Date;
  scheduledTime?: string;
  notes?: string;
  activeBookingId?: Types.ObjectId;
  basePrice: number;
  addonPrice: number;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  status: CartStatus;
  createdAt: Date;
  updatedAt: Date;
  checkedOutAt?: Date;
  checkoutExpiresAt?: Date;
  convertedToBookingAt?: Date;
}

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

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
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

    name: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const addonServiceSchema = new Schema<IAddonService>(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
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

    thumbnailImage: {
      type: String,
    },

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

    customerDetails: {
      name: String,
      email: { type: String, lowercase: true, trim: true },
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
      type: [addonServiceSchema],
      default: [],
    },

    scheduledDate: {
      type: Date,
    },

    scheduledTime: {
      type: String,
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

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "ACTIVE",
        "SCHEDULED",
        "CHECKOUT_PENDING",
        "CHECKED_OUT",
        "EXPIRED",
        "CANCELLED",
        "DELETED",
      ] as CartStatus[],
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
  {
    timestamps: true,
  },
);

cartSchema.pre("validate", function () {
  if (
    (!this.serviceId && !this.packageId) ||
    (this.serviceId && this.packageId)
  ) {
    throw new Error("Cart must contain either serviceId or packageId");
  }
});

cartSchema.pre("validate", function () {
  const hasUser = !!this.userId;
  const hasGuest = !!this.guestId;

  if (!hasUser && !hasGuest) {
    throw new Error("Cart must belong to a user or guest");
  }

  if (hasUser && hasGuest) {
    throw new Error("Cart cannot belong to both user and guest");
  }
});

cartSchema.pre("validate", function () {
  const hasCouponId = !!this.couponId;
  const hasCouponCode = !!this.couponCode;

  if (hasCouponId !== hasCouponCode) {
    throw new Error("couponId and couponCode must be provided together");
  }
});

cartSchema.index({
  userId: 1,
  status: 1,
});

cartSchema.index({
  guestId: 1,
  status: 1,
});

cartSchema.index({
  serviceId: 1,
});

cartSchema.index({
  packageId: 1,
});

cartSchema.index({
  status: 1,
  checkoutExpiresAt: 1,
});

cartSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 86400, // 24h
    partialFilterExpression: {
      guestId: { $exists: true },
      userId: { $exists: false },
    },
  },
);

export const Cart: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);
