import { Schema, model, type Document } from "mongoose";

export interface IPermission extends Document {
    name: string;
    key: string;
    module: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>(
    {
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
            match: [/^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/, "Permission key must follow module.action format"],
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
    },
    {
        timestamps: true,
    },
);

permissionSchema.index({ module: 1, isActive: 1 });

export const Permission = model<IPermission>("Permission", permissionSchema);