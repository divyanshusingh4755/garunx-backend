import { Schema, model, } from "mongoose";
const permissionSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    key: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/,
            "Permission key must follow module.action format",
        ],
    },
    module: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        required: true,
    },
}, {
    timestamps: true,
});
permissionSchema.index({
    module: 1,
    isActive: 1,
});
export const Permission = model("Permission", permissionSchema);
//# sourceMappingURL=permission.model.js.map