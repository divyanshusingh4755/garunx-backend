import { Schema, model } from "mongoose";
const AddressSchema = new Schema({
    line1: String,
    line2: String,
    village: String,
    city: String,
    tehsil: String,
    district: String,
    state: String,
    country: {
        type: String,
        default: "India"
    },
    pincode: String,
}, {
    _id: false
});
const FamilyMemberSchema = new Schema({
    familyId: {
        type: Schema.Types.ObjectId,
        ref: "Family",
        required: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
    },
    middleName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
});
//# sourceMappingURL=family-member.model.js.map