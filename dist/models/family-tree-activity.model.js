import { Schema, model, Types, } from "mongoose";
const familyTreeChangeSchema = new Schema({
    field: {
        type: String,
        required: true,
    },
    oldValue: {
        type: Schema.Types.Mixed,
    },
    newValue: {
        type: Schema.Types.Mixed,
    },
}, {
    _id: false,
});
const familyTreeActivitySchema = new Schema({
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    familyMemberId: {
        type: Schema.Types.ObjectId,
        ref: "FamilyMember",
        required: true,
        index: true,
    },
    action: {
        type: String,
        enum: [
            "MEMBER_ADDED",
            "MEMBER_UPDATED",
            "MEMBER_DELETED",
            "MEMBER_RESTORED",
            "RELATIONSHIP_LINKED",
            "RELATIONSHIP_UNLINKED",
        ],
        required: true,
        index: true,
    },
    performedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    performedByRole: {
        type: String,
        required: true,
    },
    source: {
        type: String,
        enum: [
            "CUSTOMER_SELF",
            "COORDINATOR_BOOKING",
            "ADMIN_MANUAL",
            "SYSTEM_IMPORT",
        ],
        required: true,
    },
    bookingId: {
        type: Schema.Types.ObjectId,
        ref: "Booking",
    },
    bookingReference: {
        type: String,
        trim: true,
    },
    changes: {
        type: [familyTreeChangeSchema],
        default: [],
    },
    reason: {
        type: String,
        trim: true,
        maxlength: 500,
    },
    metadata: {
        type: Schema.Types.Mixed,
    },
}, {
    timestamps: {
        createdAt: true,
        updatedAt: false,
    },
});
familyTreeActivitySchema.index({
    ownerId: 1,
    createdAt: -1,
});
familyTreeActivitySchema.index({
    familyMemberId: 1,
    createdAt: -1,
});
familyTreeActivitySchema.index({
    bookingId: 1,
    createdAt: -1,
});
export const FamilyTreeActivity = model("FamilyTreeActivity", familyTreeActivitySchema);
//# sourceMappingURL=family-tree-activity.model.js.map