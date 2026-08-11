import { model, Schema } from "mongoose";
const serviceComponentItemSchema = new Schema({
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
}, {
    _id: false,
});
const serviceComponentSchema = new Schema({
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
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: "Service",
        required: true,
        index: true,
    },
    componentId: {
        type: Schema.Types.ObjectId,
        ref: "Component",
        required: true,
        index: true,
    },
    tierId: {
        type: Schema.Types.ObjectId,
        ref: "Tier",
        required: true,
        index: true,
    },
    isRequired: {
        type: Boolean,
        required: true,
        default: false,
    },
    items: {
        type: [serviceComponentItemSchema],
        default: [],
    },
}, {
    timestamps: true,
});
serviceComponentSchema.index({
    serviceId: 1,
    componentId: 1,
    tierId: 1,
}, {
    unique: true,
});
serviceComponentSchema.index({
    serviceId: 1,
    tierId: 1,
});
export const ServiceComponent = model("ServiceComponent", serviceComponentSchema);
//# sourceMappingURL=servicecomponent.model.js.map