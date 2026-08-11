import { model, Schema } from "mongoose";
const componentSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    isRemovable: {
        type: Boolean,
        required: true,
        default: true,
    },
    isBundled: {
        type: Boolean,
        required: true,
        default: true,
    },
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    imageUrl: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
        index: true,
    },
}, {
    timestamps: true,
});
componentSchema.index({
    categoryId: 1,
});
componentSchema.index({
    name: "text",
    description: "text",
}, {
    name: "ComponentTextSearchIndex",
});
componentSchema.index({
    isRemovable: 1,
    createdAt: -1,
});
componentSchema.index({
    isBundled: 1,
    createdAt: -1,
});
export const Component = model("Component", componentSchema);
//# sourceMappingURL=component.model.js.map