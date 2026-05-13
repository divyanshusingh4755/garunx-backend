import { model, Schema, Types, Document, Model } from "mongoose";

import { Counter } from "./counter.model.js";

type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

type PaymentMethod =
  | "COD"
  | "RAZORPAY"
  | "STRIPE"
  | "UPI"
  | "CARD"
  | "NETBANKING";

type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "PARTIAL_REFUND";

type BookedBy = "CUSTOMER" | "ADMIN" | "SUBADMIN";

type EntryType = "SERVICE" | "PACKAGE";

type ComponentType = "DEFAULT" | "ADDON";

type ServiceRole = "PRIMARY" | "INCLUDED" | "ADDON";

interface IBookingSelectedItem {
  itemId: Types.ObjectId;
  name: string;
  price?: number;
}

const bookingSelectedItemSchema = new Schema<IBookingSelectedItem>(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "ComponentItem",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

interface IBookingComponent {
  componentType: ComponentType;

  serviceComponentId?: Types.ObjectId;

  componentId: Types.ObjectId;

  name: string;

  description?: string;

  isRequired: boolean;

  isRemovable: boolean;

  isBundled: boolean;

  selected: boolean;

  selectedItems: IBookingSelectedItem[];

  pricing: {
    basePrice: number;
    itemsTotal: number;
    total: number;
  };
}

const bookingComponentSchema = new Schema<IBookingComponent>(
  {
    componentType: {
      type: String,
      enum: ["DEFAULT", "ADDON"],
      required: true,
    },

    serviceComponentId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceComponent",
    },

    componentId: {
      type: Schema.Types.ObjectId,
      ref: "Component",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    isRequired: {
      type: Boolean,
      default: false,
    },

    isRemovable: {
      type: Boolean,
      default: true,
    },

    isBundled: {
      type: Boolean,
      default: false,
    },

    selected: {
      type: Boolean,
      default: true,
    },

    selectedItems: {
      type: [bookingSelectedItemSchema],
      default: [],
    },

    pricing: {
      basePrice: {
        type: Number,
        default: 0,
        min: 0,
      },

      itemsTotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      total: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  {
    _id: false,
  },
);

interface IBookingServiceConfiguration {
  serviceId: Types.ObjectId;

  serviceSnapshot: {
    name: string;
    shortDescription?: string;
    thumbnailImage?: string;
    serviceReference?: string;
  };

  serviceRole: ServiceRole;

  subService?: {
    subServiceId: Types.ObjectId;
    name: string;
  };

  tier: {
    tierId: Types.ObjectId;
    name: string;
  };

  location: {
    locationId: Types.ObjectId;
    name: string;
  };

  components: IBookingComponent[];

  pricing: {
    subtotal: number;
    taxes: number;
    discount: number;
    grandTotal: number;
  };
}

const bookingServiceConfigurationSchema =
  new Schema<IBookingServiceConfiguration>(
    {
      serviceId: {
        type: Schema.Types.ObjectId,
        ref: "Service",
        required: true,
      },

      serviceSnapshot: {
        name: {
          type: String,
          required: true,
        },

        shortDescription: String,

        thumbnailImage: String,

        serviceReference: String,
      },

      serviceRole: {
        type: String,
        enum: ["PRIMARY", "INCLUDED", "ADDON"],
        default: "PRIMARY",
      },

      subService: {
        subServiceId: {
          type: Schema.Types.ObjectId,
          ref: "SubServiceComponent",
        },

        name: String,
      },

      tier: {
        tierId: {
          type: Schema.Types.ObjectId,
          ref: "Tier",
          required: true,
        },

        name: {
          type: String,
          required: true,
        },
      },

      location: {
        locationId: {
          type: Schema.Types.ObjectId,
          ref: "Location",
          required: true,
        },

        name: {
          type: String,
          required: true,
        },
      },

      components: {
        type: [bookingComponentSchema],
        default: [],
      },

      pricing: {
        subtotal: {
          type: Number,
          default: 0,
        },

        taxes: {
          type: Number,
          default: 0,
        },

        discount: {
          type: Number,
          default: 0,
        },

        grandTotal: {
          type: Number,
          default: 0,
        },
      },
    },
    {
      _id: false,
    },
  );

interface IBookingPackageConfiguration {
  packageId: Types.ObjectId;

  packageSnapshot: {
    name: string;
    shortDescription?: string;
    thumbnailImage?: string;
    packageReference?: string;
  };

  services: IBookingServiceConfiguration[];

  addonServices: IBookingServiceConfiguration[];

  pricing: {
    subtotal: number;
    taxes: number;
    discount: number;
    grandTotal: number;
  };
}

interface IBookingEntry {
  entryType: EntryType;

  entryId: Types.ObjectId;

  serviceConfiguration?: IBookingServiceConfiguration;

  packageConfiguration?: IBookingPackageConfiguration;
}

const bookingPackageConfigurationSchema =
  new Schema<IBookingPackageConfiguration>(
    {
      packageId: {
        type: Schema.Types.ObjectId,
        ref: "Package",
        required: true,
      },

      packageSnapshot: {
        name: String,

        shortDescription: String,

        thumbnailImage: String,

        packageReference: String,
      },

      services: {
        type: [bookingServiceConfigurationSchema],
        default: [],
      },

      addonServices: {
        type: [bookingServiceConfigurationSchema],
        default: [],
      },

      pricing: {
        subtotal: {
          type: Number,
          default: 0,
        },

        taxes: {
          type: Number,
          default: 0,
        },

        discount: {
          type: Number,
          default: 0,
        },

        grandTotal: {
          type: Number,
          default: 0,
        },
      },
    },
    {
      _id: false,
    },
  );

const bookingEntrySchema = new Schema<IBookingEntry>(
  {
    entryType: {
      type: String,
      enum: ["SERVICE", "PACKAGE"],
      required: true,
    },

    entryId: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    serviceConfiguration: {
      type: bookingServiceConfigurationSchema,
    },

    packageConfiguration: {
      type: bookingPackageConfigurationSchema,
    },
  },
  {
    _id: false,
  },
);

bookingEntrySchema.pre(
  "validate",
  { document: true, query: false },
  function (next) {
    if (typeof next !== "function") return;

    if (this.entryType === "SERVICE") {
      if (!this.serviceConfiguration) {
        return next(new Error("serviceConfiguration required"));
      }
      if (this.packageConfiguration) {
        return next(new Error("packageConfiguration not allowed for SERVICE"));
      }
    }

    if (this.entryType === "PACKAGE") {
      if (!this.packageConfiguration) {
        return next(new Error("packageConfiguration required"));
      }
      if (this.serviceConfiguration) {
        return next(new Error("serviceConfiguration not allowed for PACKAGE"));
      }
    }

    next();
  },
);

export interface IBooking extends Document {
  userId?: Types.ObjectId;

  subAdminId?: Types.ObjectId;

  cartId: Types.ObjectId;

  bookingReference: string;

  bookedBy: BookedBy;

  entries: IBookingEntry[];

  customerDetails: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    caste?: string;
    gotra?: string;
  };

  pricing: {
    subtotal: number;
    taxes: number;
    discount: number;
    grandTotal: number;
    earnings?: number;
  };

  payment: {
    status: PaymentStatus;
    transactionId?: string;
    paymentMethod?: PaymentMethod;
    gateway?: string;
    amountPaid?: number;
    refundAmount?: number;
    paidAt?: Date;
    refundedAt?: Date;
  };

  status: BookingStatus;

  cancellation?: {
    reason?: string;
    cancelledBy?: Types.ObjectId;
    cancelledByRole?: "CUSTOMER" | "ADMIN" | "SUBADMIN";
    cancelledAt?: Date;
  };

  lifecycle?: {
    confirmedAt?: Date;
    completedAt?: Date;
    cancelledAt?: Date;
  };

  scheduledAt?: Date;

  notes?: string;

  cartSnapshot?: Record<string, unknown>;

  isDeleted?: boolean;
}

const bookingSchema = new Schema<IBooking>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    subAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    cartId: {
      type: Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
      index: true,
    },

    bookingReference: {
      type: String,
      unique: true,
      index: true,
    },

    bookedBy: {
      type: String,
      enum: ["CUSTOMER", "ADMIN", "SUBADMIN"],
      default: "CUSTOMER",
    },

    entries: {
      type: [bookingEntrySchema],
      required: true,
      default: [],
      validate: {
        validator: (entries: IBookingEntry[]) => entries.length > 0,

        message: "Booking must contain at least one entry",
      },
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

    pricing: {
      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },

      taxes: {
        type: Number,
        default: 0,
        min: 0,
      },

      discount: {
        type: Number,
        default: 0,
        min: 0,
      },

      grandTotal: {
        type: Number,
        required: true,
        min: 0,
      },

      earnings: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    payment: {
      status: {
        type: String,
        enum: ["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIAL_REFUND"],
        default: "PENDING",
      },

      transactionId: String,

      paymentMethod: {
        type: String,
        enum: ["COD", "RAZORPAY", "STRIPE", "UPI", "CARD", "NETBANKING"],
      },

      gateway: String,

      amountPaid: {
        type: Number,
        default: 0,
        min: 0,
      },

      refundAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      paidAt: Date,

      refundedAt: Date,
    },

    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },

    cancellation: {
      reason: String,

      cancelledBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      cancelledByRole: {
        type: String,
        enum: ["CUSTOMER", "ADMIN", "SUBADMIN"],
      },

      cancelledAt: Date,
    },

    lifecycle: {
      confirmedAt: Date,

      completedAt: Date,

      cancelledAt: Date,
    },

    scheduledAt: Date,

    notes: {
      type: String,
      maxlength: 1000,
    },

    cartSnapshot: {
      type: Schema.Types.Mixed,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

bookingSchema.index({
  userId: 1,
  status: 1,
});

bookingSchema.index({
  userId: 1,
  createdAt: -1,
});

bookingSchema.index({
  createdAt: -1,
});

bookingSchema.index({
  scheduledAt: 1,
  status: 1,
});

bookingSchema.index({
  "payment.status": 1,
});

bookingSchema.index({
  bookingReference: 1,
});

bookingSchema.pre("save", async function () {
  if (!this.isNew) return;

  const counter = await Counter.findOneAndUpdate(
    { id: "bookingId" },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
    },
  );

  if (!counter) {
    throw new Error("Failed to generate booking reference");
  }

  this.bookingReference = `BK-${counter.seq.toString().padStart(6, "0")}`;
});

export const Booking: Model<IBooking> = model<IBooking>(
  "Booking",
  bookingSchema,
);
