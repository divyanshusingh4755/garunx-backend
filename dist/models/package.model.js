import { model, Schema, Types, Document } from "mongoose";
const packageSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String
    },
    services: {
        type: [{
                serviceId: {
                    type: Schema.Types.ObjectId,
                    ref: "Service",
                    required: true
                },
                displayOrder: {
                    type: Number,
                    default: 0
                }
            }],
        validate: {
            validator: function (services) {
                return services && services.length > 0;
            },
            message: "Package must contain at least on service"
        }
    },
    locations: {
        type: [String],
        required: true,
        validate: {
            validator: (val) => val.length > 0,
            message: "At least one location is required"
        }
    },
    image: {
        type: String
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
packageSchema.index({
    locations: 1,
    isActive: 1,
    isDeleted: 1,
    displayOrder: 1
});
packageSchema.index({ "services.serviceId": 1 });
packageSchema.index({
    name: "text",
    description: "text"
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
    const serviceIds = this.services.map(s => s.serviceId.toString());
    if (new Set(serviceIds).size !== serviceIds.length) {
        throw new Error("Duplicate services are not allowed in package");
    }
});
export const Package = model('Package', packageSchema);
//# sourceMappingURL=package.model.js.map