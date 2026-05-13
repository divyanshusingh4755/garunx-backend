import { model, Schema, Types, Document } from "mongoose";
const packageServiceSchema = new Schema({
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: "Service",
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    serviceRole: {
        type: String,
        enum: ["INCLUDED", "OPTIONAL"],
        default: "INCLUDED",
    },
    defaultTierId: {
        type: Schema.Types.ObjectId,
        ref: "Tier",
    },
    allowedTierIds: [
        {
            type: Schema.Types.ObjectId,
            ref: "Tier",
        },
    ],
    displayOrder: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { _id: false });
const packageSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    shortDescription: {
        type: String,
        maxlength: 200,
    },
    description: {
        type: String,
    },
    packageReference: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
        index: true,
    },
    services: {
        type: [packageServiceSchema],
        validate: {
            validator: function (services) {
                return services && services.length > 0;
            },
            message: "Package must contain at least one service",
        },
    },
    locations: [
        {
            type: Schema.Types.ObjectId,
            ref: "Location",
        },
    ],
    image: {
        type: String,
    },
    pricing: {
        type: {
            type: String,
            enum: ["DERIVED", "FIXED"],
            default: "DERIVED",
        },
        fixedPrice: {
            type: Number,
            min: 0,
        },
        discountPercentage: {
            type: Number,
            min: 0,
            max: 100,
        },
    },
    displayOrder: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    version: {
        type: Number,
        default: 1,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
}, {
    timestamps: true,
});
packageSchema.index({
    isActive: 1,
    categoryId: 1,
});
packageSchema.index({
    locations: 1,
});
packageSchema.index({
    "services.serviceId": 1,
});
packageSchema.index({
    createdAt: -1,
});
packageSchema.index({
    name: "text",
    shortDescription: "text",
    description: "text",
});
packageSchema.pre("save", async function () {
    if (this.pricing.type === "FIXED") {
        if (this.pricing.fixedPrice === undefined) {
            throw new Error("Fixed price is required when pricing type is FIXED");
        }
        delete this.pricing.discountPercentage;
    }
    if (this.pricing.type === "DERIVED") {
        delete this.pricing.fixedPrice;
    }
    const serviceIds = this.services.map((service) => service.serviceId.toString());
    if (new Set(serviceIds).size !== serviceIds.length) {
        throw new Error("Duplicate services are not allowed in package");
    }
});
export const Package = model("Package", packageSchema);
//# sourceMappingURL=package.model.js.map