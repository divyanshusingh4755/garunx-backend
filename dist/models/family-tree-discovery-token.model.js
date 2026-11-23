import { Schema, Types, model } from "mongoose";
const schema = new Schema({
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
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const FamilyTreeDiscoveryToken = model("FamilyTreeDiscoveryToken", schema);
//# sourceMappingURL=family-tree-discovery-token.model.js.map