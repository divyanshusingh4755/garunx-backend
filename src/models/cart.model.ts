import mongoose, { Document, Model, Schema, Types } from "mongoose";

type EntryType = "SERVICE" | "PACKAGE";
type ComponentType = "DEFAULT" | "ADDON";
type ServiceRole = "PRIMARY" | "INCLUDED" | "ADDON";
type CartType = "SERVICE" | "PACKAGE" | "MIXED";

interface ISelectedItem {
  itemId: Types.ObjectId;
  name: string;
  price?: number;
}

const selectedItemSchema = new Schema<ISelectedItem>(
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
  { _id: false },
);

interface ICartComponent {
  componentType: ComponentType;
  serviceComponentId?: Types.ObjectId;
  componentId: Types.ObjectId;
  name: string;
  description?: string;
  isRequired: boolean;
  isRemovable: boolean;
  isBundled: boolean;
  selected: boolean;
  selectedItems: ISelectedItem[];
  pricing: {
    basePrice: number;
    itemsTotal: number;
    total: number;
  };
}

const cartComponentSchema = new Schema<ICartComponent>(
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
    description: {
      type: String,
    },
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
      type: [selectedItemSchema],
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
  { _id: false },
);

interface IPackageConfiguration {
  packageId: Types.ObjectId;

  packageSnapshot: {
    name: string;
    shortDescription?: string;
    thumbnailImage?: string;
    packageReference?: string;
  };

  services: IServiceConfiguration[];

  addonServices: IServiceConfiguration[];

  pricing: {
    subtotal: number;
    taxes: number;
    discount: number;
    grandTotal: number;
  };
}

interface IServiceConfiguration {
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

  components: ICartComponent[];

  pricing: {
    subtotal: number;
    taxes: number;
    discount: number;
    grandTotal: number;
  };
}

const serviceConfigurationSchema = new Schema<IServiceConfiguration>(
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
      required: true,
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
      type: [cartComponentSchema],
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

const packageConfigurationSchema = new Schema<IPackageConfiguration>(
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
      type: [serviceConfigurationSchema],
      default: [],
    },

    addonServices: {
      type: [serviceConfigurationSchema],
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

interface ICartEntry {
  entryType: EntryType;
  entryId: Types.ObjectId;
  serviceConfiguration?: IServiceConfiguration;
  packageConfiguration?: IPackageConfiguration;
}

const cartEntrySchema = new Schema<ICartEntry>(
  {
    entryType: {
      type: String,
      enum: ["SERVICE", "PACKAGE"],
      required: true,
    },

    entryId: {
      type: Schema.Types.ObjectId,
      required: true,
      default: () => new mongoose.Types.ObjectId(),
    },

    serviceConfiguration: {
      type: serviceConfigurationSchema,
    },

    packageConfiguration: {
      type: packageConfigurationSchema,
    },
  },
  { _id: false },
);

export interface ICart extends Document {
  userId?: Types.ObjectId;
  customerDetails: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    caste?: string;
    gotra?: string;
  };

  cartType: CartType;

  scheduledAt?: Date;
  notes?: string;
  entries: ICartEntry[];
  pricing: {
    subtotal: number;
    taxes: number;
    discount: number;
    grandTotal: number;
    calculatedAt?: Date;
  };

  validation: {
    isValid: boolean;
    hasPricingChanged: boolean;
    unavailableServices: boolean;
    unavailableComponents: boolean;
    errors: string[];
    lastValidatedAt?: Date;
  };

  status: "ACTIVE" | "CHECKED_OUT" | "EXPIRED" | "ABANDONED";
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    cartType: {
      type: String,
      enum: ["SERVICE", "PACKAGE", "MIXED"],
      default: "SERVICE",
      index: true,
    },

    customerDetails: {
      name: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
      },
      caste: {
        type: String,
      },
      gotra: {
        type: String,
      },
    },

    scheduledAt: {
      type: Date,
    },

    notes: {
      type: String,
      maxlength: 1000,
    },
    entries: {
      type: [cartEntrySchema],
      default: [],
    },

    pricing: {
      subtotal: {
        type: Number,
        default: 0,
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
        default: 0,
        min: 0,
      },

      calculatedAt: {
        type: Date,
      },
    },

    validation: {
      isValid: {
        type: Boolean,
        default: true,
      },

      hasPricingChanged: {
        type: Boolean,
        default: false,
      },

      unavailableServices: {
        type: Boolean,
        default: false,
      },

      unavailableComponents: {
        type: Boolean,
        default: false,
      },

      errors: {
        type: [String],
        default: [],
      },

      lastValidatedAt: {
        type: Date,
      },
    },
    status: {
      type: String,
      enum: ["ACTIVE", "CHECKED_OUT", "EXPIRED", "ABANDONED"],
      default: "ACTIVE",
      index: true,
    },

    expiresAt: {
      type: Date,
      index: true,
    },
  },
  { timestamps: true },
);

cartEntrySchema.pre(
  "validate",
  { document: true, query: false },
  function (next) {
    if (typeof next !== "function") return;

    if (this.entryType === "SERVICE") {
      delete this.packageConfiguration;

      if (!this.serviceConfiguration) {
        return next(new Error("serviceConfiguration required"));
      }
    }

    if (this.entryType === "PACKAGE") {
      delete this.serviceConfiguration;

      if (!this.packageConfiguration) {
        return next(new Error("packageConfiguration required"));
      }
    }

    next();
  },
);

cartSchema.index({
  userId: 1,
  status: 1,
});

cartSchema.index({
  expiresAt: 1,
});

cartSchema.index({
  updatedAt: -1,
});

cartSchema.index({
  "validation.isValid": 1,
  "validation.hasPricingChanged": 1,
});

cartSchema.index({
  createdAt: -1,
});

export const Cart: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);
