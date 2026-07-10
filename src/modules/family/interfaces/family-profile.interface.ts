import { Document, Types } from "mongoose";

export interface IFamilyProfile extends Document {
    familyId: Types.ObjectId;
    surname: string;
    gotra?: string;
    kuldevi?: string;
    kuldevta?: string;
    nativeVillage?: string;
    nativeTehsil?: string;
    nativeDistrict?: string;
    nativeState?: string;
    nativeCountry?: string;
    pincode: string;
    familyOrigin?: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}