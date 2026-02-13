import { model, Schema } from "mongoose";
const packageSchema = new Schema({
    name: { type: String, required: true },
    includedServices: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
    locationIds: [{ type: Schema.Types.ObjectId, ref: 'Location' }],
    packagePrice: { type: Number, required: true },
    isActive: { type: Boolean, default: true }
});
export const Package = model('Package', packageSchema);
//# sourceMappingURL=package.model.js.map