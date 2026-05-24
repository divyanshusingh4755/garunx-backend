import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type CartStatus =
  | "ACTIVE"
  | "SCHEDULED"
  | "CHECKOUT_PENDING"
  | "CHECKED_OUT"
  | "BOOKED"
  | "EXPIRED"
  | "CANCELLED"
  | "DELETED";

export interface ISelectedComponentItem {
  itemId: Types.ObjectId;
  name: string;
  price?: number;
}

export interface ISelectedComponent {
  componentId: Types.ObjectId;
  name: string;
  items: ISelectedComponentItem[];
  totalPrice: number;
}

export interface IAddonService {
  serviceId: Types.ObjectId;
  name: string;
  price: number;
}

export interface ICart extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId | null;
  serviceId?: Types.ObjectId;
  packageId?: Types.ObjectId;
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
  addonServices?: IAddonService[];
  scheduledDate?: Date;
  scheduledTime?: string;
  notes?: string;
  activeBookingId?: Types.ObjectId;
  basePrice: number;
  addonPrice: number;
  totalAmount: number;
  status: CartStatus;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
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

    price: {
      type: Number,
      min: 0,
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
      email: String,
      phone: String,
      address: String,
      caste: String,
      gotra: String,
    },

    selectedComponents: {
      type: [selectedComponentSchema],
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
        "BOOKED",
        "EXPIRED",
        "CANCELLED",
        "DELETED",
      ] as CartStatus[],
      default: "ACTIVE",
      index: true,
    },

    expiresAt: {
      type: Date,
      index: {
        expireAfterSeconds: 0,
      },
    },
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

cartSchema.index({
  userId: 1,
  status: 1,
});

cartSchema.index({
  serviceId: 1,
});

cartSchema.index({
  packageId: 1,
});

export const Cart: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);
