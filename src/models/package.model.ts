import { model, Schema } from "mongoose";

export interface IPackage extends Document {
    name: string;
    includedServices: Schema.Types.ObjectId[];
    locationIds: Schema.Types.ObjectId[];
    packagePrice: number;
    isActive: boolean;
}

const packageSchema = new Schema<IPackage>({
    name: { type: String, required: true },
    includedServices: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
    locationIds: [{ type: Schema.Types.ObjectId, ref: 'Location' }],
    packagePrice: { type: Number, required: true },
    isActive: { type: Boolean, default: true }
})

export const Package = model<IPackage>('Package', packageSchema)