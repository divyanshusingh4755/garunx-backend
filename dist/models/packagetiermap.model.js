import { model, Schema, Document, Types } from "mongoose";
const packageTierServiceSchema = new Schema({
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: "Service",
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    isRequired: {
        type: Boolean,
        default: false,
    },
    isRelated: {
        type: Boolean,
        default: false,
    },
}, { _id: false });
const packageTierMapSchema = new Schema({
    packageId: {
        type: Schema.Types.ObjectId,
        ref: "Package",
        required: true,
        index: true,
    },
    tierId: {
        type: Schema.Types.ObjectId,
        ref: "Tier",
        required: true,
        index: true,
    },
    services: [packageTierServiceSchema],
}, {
    timestamps: true,
});
packageTierMapSchema.index({
    packageId: 1,
    tierId: 1,
});
packageTierServiceSchema.pre("validate", function () {
    if (this.isRequired && this.isRelated) {
        throw new Error("A service cannot be both required and related");
    }
});
export const PackageTierMap = model("PackageTierMap", packageTierMapSchema);
//# sourceMappingURL=packagetiermap.model.js.map