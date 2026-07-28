import { Schema, Types, model, } from "mongoose";
import { Caste, FamilyRelation, Gender, Gotra, MemberLifeStatus, } from "../types/enums.js";
const familyMemberSchema = new Schema({
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
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
    sourceBookingId: {
        type: Schema.Types.ObjectId,
        ref: "Booking",
        default: null,
    },
    sourceBookingReference: {
        type: String,
        trim: true,
        default: null,
    },
    isDeleted: {
        type: Boolean,
        default: false,
        required: true,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
    deletedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    deletionReason: {
        type: String,
        trim: true,
        maxlength: 500,
        default: null,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 120,
    },
    relation: {
        type: String,
        enum: Object.values(FamilyRelation),
        required: true,
    },
    gender: {
        type: String,
        enum: Object.values(Gender),
    },
    dob: Date,
    lifeStatus: {
        type: String,
        enum: Object.values(MemberLifeStatus),
        default: MemberLifeStatus.ALIVE,
        required: true,
    },
    dateOfDeath: {
        type: Date,
        default: null,
    },
    fatherId: {
        type: Schema.Types.ObjectId,
        ref: "FamilyMember",
        default: null,
    },
    motherId: {
        type: Schema.Types.ObjectId,
        ref: "FamilyMember",
        default: null,
    },
    spouseIds: {
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: "FamilyMember",
            },
        ],
        default: [],
        validate: {
            validator: (spouseIds) => {
                const uniqueIds = new Set(spouseIds.map((id) => id.toString()));
                return (uniqueIds.size ===
                    spouseIds.length);
            },
            message: "Duplicate spouse IDs are not allowed",
        },
    },
    nativeVillage: {
        type: String,
        trim: true,
        maxlength: 120,
    },
    state: {
        type: String,
        trim: true,
        maxlength: 120,
    },
    district: {
        type: String,
        trim: true,
        maxlength: 120,
    },
    caste: {
        type: String,
        enum: Object.values(Caste),
    },
    gotra: {
        type: String,
        enum: Object.values(Gotra),
    },
    designatedPandit: {
        type: String,
        trim: true,
        maxlength: 120,
    },
    visitors: {
        type: [
            {
                type: String,
                trim: true,
                maxlength: 120,
            },
        ],
        default: [],
    },
    profileImage: {
        type: String,
        default: null,
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
}, {
    timestamps: true,
});
familyMemberSchema.pre("validate", function () {
    if (this.source ===
        "COORDINATOR_BOOKING" &&
        !this.sourceBookingId) {
        throw new Error("Booking ID is required when a family member is added by a coordinator");
    }
    if (this.lifeStatus ===
        MemberLifeStatus.ALIVE &&
        this.dateOfDeath) {
        throw new Error("Date of death cannot be provided for an alive family member");
    }
    if (this.fatherId &&
        this.motherId &&
        this.fatherId.equals(this.motherId)) {
        throw new Error("Father and mother cannot be the same family member");
    }
    if (this._id &&
        this.fatherId?.equals(this._id)) {
        throw new Error("A family member cannot be their own father");
    }
    if (this._id &&
        this.motherId?.equals(this._id)) {
        throw new Error("A family member cannot be their own mother");
    }
    if (this._id &&
        this.spouseIds.some((spouseId) => spouseId.equals(this._id))) {
        throw new Error("A family member cannot be their own spouse");
    }
});
familyMemberSchema.index({
    ownerId: 1,
    isDeleted: 1,
    fatherId: 1,
});
familyMemberSchema.index({
    ownerId: 1,
    isDeleted: 1,
    motherId: 1,
});
familyMemberSchema.index({
    ownerId: 1,
    isDeleted: 1,
    spouseIds: 1,
});
familyMemberSchema.index({
    ownerId: 1,
    isDeleted: 1,
    fullName: 1,
});
familyMemberSchema.index({
    ownerId: 1,
    isDeleted: 1,
    createdAt: -1,
});
familyMemberSchema.index({
    sourceBookingId: 1,
    isDeleted: 1,
});
export const FamilyMember = model("FamilyMember", familyMemberSchema);
//# sourceMappingURL=family-member.model.js.map