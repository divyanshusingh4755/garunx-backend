import { Schema, Types, model, type Document } from "mongoose";

export interface IFamilyTreeDiscoveryToken extends Document {
    requesterId: Types.ObjectId;
    treeOwnerId: Types.ObjectId;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<IFamilyTreeDiscoveryToken>(
    {
        requesterId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        treeOwnerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true,
            select: false,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true },
);

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const FamilyTreeDiscoveryToken = model<IFamilyTreeDiscoveryToken>("FamilyTreeDiscoveryToken", schema);
