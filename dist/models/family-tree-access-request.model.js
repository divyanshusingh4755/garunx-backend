import { Schema, Types, model } from "mongoose";
const schema = new Schema({
    treeOwnerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    familyMemberId: {
        type: Schema.Types.ObjectId,
        ref: "FamilyMember",
        default: null,
        index: true,
    },
    requesterId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    type: {
        type: String,
        enum: ["INVITATION", "JOIN_REQUEST"],
        required: true,
    },
    status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        required: true,
        default: "PENDING",
    },
    invitationTokenHash: {
        type: String,
        default: null,
        select: false,
    },
    invitedEmail: {
        type: String,
        lowercase: true,
        trim: true,
        default: null,
    },
    invitedPhoneNumber: {
        type: String,
        trim: true,
        default: null,
    },
    invitationExpiresAt: {
        type: Date,
        default: null,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    decidedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    decidedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });
schema.index({ familyMemberId: 1, type: 1, status: 1 });
schema.index({ treeOwnerId: 1, status: 1, createdAt: -1 });
schema.index({ requesterId: 1, status: 1 });
schema.index({ invitationTokenHash: 1 }, {
    unique: true,
    partialFilterExpression: { invitationTokenHash: { $type: "string" } },
});
schema.index({
    treeOwnerId: 1,
    requesterId: 1,
    type: 1,
    status: 1,
}, {
    unique: true,
    partialFilterExpression: {
        type: "JOIN_REQUEST",
        status: "PENDING",
    },
});
export const FamilyTreeAccessRequest = model("FamilyTreeAccessRequest", schema);
//# sourceMappingURL=family-tree-access-request.model.js.map