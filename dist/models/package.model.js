import { model, Schema, Types, Document } from "mongoose";
const packageItemSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    variantSelection: {
        tier: {
            type: String,
            trim: true
        }
    },
    isOptional: {
        type: Boolean,
        default: false
    },
    isEditable: {
        type: Boolean,
        default: true
    }
}, { _id: false });
const packageSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String
    },
    applicableServices: [{
            type: Schema.Types.ObjectId,
            ref: "Service",
            index: true
        }],
    locations: [{
            type: String,
            index: true
        }],
    items: {
        type: [packageItemSchema],
        validate: {
            validator: function (items) {
                if (!items || items.length === 0)
                    return false;
                // Prevent duplicate productIds
                const ids = items.map(i => i.productId.toString());
                return new Set(ids).size === ids.length;
            },
            message: "Package must have  unique products and at least one item"
        }
    },
    pricing: {
        type: {
            type: String,
            enum: ["DERIVED", "FIXED"],
            default: "DERIVED"
        },
        fixedPrice: {
            type: Number,
            min: 0
        },
        discountPercentage: {
            type: Number,
            min: 0,
            max: 100
        }
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    version: {
        type: Number,
        default: 1
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });
packageSchema.index({ slug: 1, applicableServices: 1 }, { unique: true });
packageSchema.index({
    applicableServices: 1,
    locations: 1,
    isActive: 1,
    isDeleted: 1,
    displayOrder: 1
});
packageSchema.pre("save", async function () {
    if (this.pricing.type === "FIXED") {
        if (!this.pricing.fixedPrice) {
            throw new Error("Fixed price is required when pricing type is FIXED");
        }
        delete this.pricing.discountPercentage;
    }
    if (this.pricing.type === "DERIVED") {
        delete this.pricing.fixedPrice;
    }
});
export const Package = model('Package', packageSchema);
//# sourceMappingURL=package.model.js.map