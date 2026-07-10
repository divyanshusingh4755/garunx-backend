import { Schema, model } from "mongoose";
import { FamilyVisibility } from "../enums/family-visibility.enum.js";
import { FamilyStatus } from "../enums/family-status.enum.js";
const FamilySchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxLength: 150
    },
    description: {
        type: String,
        trim: true,
        maxLength: 1000,
    },
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        requried: true,
        index: true
    },
    rootMemberId: {
        type: Schema.Types.ObjectId,
        ref: 'FamilyMember',
        default: null
    },
    coverPhoto: {
        type: String,
        default: null,
    },
    memberCount: {
        type: Number,
        default: 0,
        min: 0
    },
    visibility: {
        type: String,
        enum: Object.values(FamilyVisibility),
        default: FamilyVisibility.PRIVATE,
    },
    settings: {
        allowInvites: {
            type: Boolean,
            default: true,
        },
        allowMemberEdit: {
            type: Boolean,
            default: false,
        },
        showLivingOnly: {
            type: Boolean,
            default: false
        }
    },
    status: {
        type: String,
        enum: Object.values(FamilyStatus),
        default: FamilyStatus.ACTIVE,
        index: true,
    }
}, {
    timestamps: true,
    versionKey: false,
});
FamilySchema.index({
    ownerId: 1
});
FamilySchema.index({
    status: 1
});
FamilySchema.index({
    visibility: 1,
});
FamilySchema.index({
    name: "text",
});
export const FamilyModel = model("Family", FamilySchema);
//# sourceMappingURL=family.model.js.map