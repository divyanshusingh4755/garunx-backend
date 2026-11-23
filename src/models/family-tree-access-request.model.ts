import { Schema, Types, model, type Document } from "mongoose";

export type FamilyTreeAccessRequestType = "INVITATION" | "JOIN_REQUEST";
export type FamilyTreeAccessRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface IFamilyTreeAccessRequest extends Document {
    treeOwnerId: Types.ObjectId;
    familyMemberId?: Types.ObjectId | null;
    requesterId?: Types.ObjectId | null;
    type: FamilyTreeAccessRequestType;
    status: FamilyTreeAccessRequestStatus;
    invitationTokenHash?: string | null;
    invitationExpiresAt?: Date | null;
    createdBy: Types.ObjectId;
    decidedBy?: Types.ObjectId | null;
    invitedEmail?: string | null;
    invitedPhoneNumber?: string | null;
    decidedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<IFamilyTreeAccessRequest>(
    {
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
    },
    { timestamps: true },
);

schema.index({ familyMemberId: 1, type: 1, status: 1 });
schema.index({ treeOwnerId: 1, status: 1, createdAt: -1 });
schema.index({ requesterId: 1, status: 1 });
schema.index(
    { invitationTokenHash: 1 },
    {
        unique: true,
        partialFilterExpression: { invitationTokenHash: { $type: "string" } },
    },
);

schema.index(
    {
        treeOwnerId: 1,
        requesterId: 1,
        type: 1,
        status: 1,
    },
    {
        unique: true,
        partialFilterExpression: {
            type: "JOIN_REQUEST",
            status: "PENDING",
        },
    },
);

export const FamilyTreeAccessRequest = model<IFamilyTreeAccessRequest>("FamilyTreeAccessRequest", schema);
