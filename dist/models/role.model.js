import { Schema, Types, model } from "mongoose";
const roleSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    key: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    permissions: {
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: "Permission",
            },
        ],
        default: [],
    },
    isActive: {
        type: Boolean,
        default: true,
        required: true,
    },
    isSystem: {
        type: Boolean,
        default: false,
        required: true,
    },
}, {
    timestamps: true,
});
export const RbacRole = model("RbacRole", roleSchema);
//# sourceMappingURL=role.model.js.map