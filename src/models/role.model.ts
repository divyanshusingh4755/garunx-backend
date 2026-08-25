import { Schema, Types, model, type Document } from "mongoose";

export interface IRbacRole extends Document {
    name: string;
    key: string;
    description?: string;
    permissions: Types.ObjectId[];
    isActive: boolean;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const roleSchema = new Schema<IRbacRole>(
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
    },
    {
        timestamps: true,
    },
);

export const RbacRole = model<IRbacRole>("RbacRole", roleSchema);