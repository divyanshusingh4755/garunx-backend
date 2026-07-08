import { model, Schema, Document } from "mongoose";
const subServiceComponentSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: String,
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: "Service",
        required: true,
        index: true,
    },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
subServiceComponentSchema.index({ name: 1 });
subServiceComponentSchema.index({
    name: "text",
    description: "text",
}, {
    name: "SubServiceComponentTextSearchIndex",
});
export const SubServiceComponent = model("SubServiceComponent", subServiceComponentSchema);
//# sourceMappingURL=subservices.model.js.map