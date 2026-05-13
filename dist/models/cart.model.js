import mongoose, { Document, Model, Schema, Types } from "mongoose";
const selectedItemSchema = new Schema({
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
}, { _id: false });
const cartComponentSchema = new Schema({
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
}, { _id: false });
const serviceConfigurationSchema = new Schema({
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
}, {
    _id: false,
});
const packageConfigurationSchema = new Schema({
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
}, {
    _id: false,
});
const cartEntrySchema = new Schema({
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
}, { _id: false });
const cartSchema = new Schema({
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
}, { timestamps: true });
cartEntrySchema.pre("validate", { document: true, query: false }, function (next) {
    if (typeof next !== "function")
        return;
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
});
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
export const Cart = mongoose.model("Cart", cartSchema);
//# sourceMappingURL=cart.model.js.map