import { Schema, model } from "mongoose";
const FamilyProfileSchema = new Schema({
    familyId: {
        type: Schema.Types.ObjectId,
        ref: "Family",
        required: true,
        unique: true,
        index: true
    },
    surname: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100,
    },
    gotra: {
        type: String,
        trim: true,
        maxLength: 100,
    },
    kuldevi: {
        type: String,
        trim: true,
        maxLength: 150,
    },
    kuldevta: {
        type: String,
        trim: true,
        maxLength: 150,
    },
    nativeVillage: {
        type: String,
        trim: true,
        maxLength: 150,
    },
    nativeTehsil: {
        type: String,
        trim: true,
        maxLength: 150,
    },
    nativeDistrict: {
        type: String,
        trim: true,
        maxLength: 150,
    },
    nativeState: {
        type: String,
        trim: true,
        maxlength: 150,
    },
    nativeCountry: {
        type: String,
        trim: true,
        maxlength: 150,
        default: "India",
    },
    pincode: {
        type: String,
        trim: true,
        maxlength: 10,
    },
    familyOrigin: {
        type: String,
        trim: true,
        maxlength: 250,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 2000,
    },
}, {
    timestamps: true,
    versionKey: false,
});
FamilyProfileSchema.index({
    familyId: 1
});
FamilyProfileSchema.index({
    surname: 1
});
FamilyProfileSchema.index({
    gotra: 1
});
FamilyProfileSchema.index({
    nativeState: 1,
    nativeDistrict: 1
});
export const FamilyProfileModel = model("FamilyProfile", FamilyProfileSchema);
//# sourceMappingURL=family-profile.model.js.map