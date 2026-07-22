import { Schema, Types, model, Document } from "mongoose";
import {
  FamilyRelation,
  MemberLifeStatus,
} from "../types/enums.js";
import {
  Caste,
  Gender,
  Gotra,
} from "../types/enums.js";

export interface IFamilyMember extends Document {
  ownerId: Types.ObjectId;

  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId | null;

  fullName: string;
  relation: FamilyRelation;
  gender?: Gender;
  dob?: Date;

  lifeStatus: MemberLifeStatus;
  dateOfDeath?: Date;

  fatherId?: Types.ObjectId | null;
  motherId?: Types.ObjectId | null;
  spouseIds: Types.ObjectId[];

  nativeVillage?: string;
  state?: string;
  district?: string;
  caste?: Caste;
  gotra?: Gotra;

  designatedPandit?: string;
  visitors?: string[];

  profileImage?: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const familyMemberSchema = new Schema<IFamilyMember>(
  {
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
      index: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
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
    },

    dateOfDeath: Date,

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
    },

    nativeVillage: {
      type: String,
      trim: true,
    },

    state: {
      type: String,
      trim: true,
    },

    district: {
      type: String,
      trim: true,
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
    },

    visitors: {
      type: [String],
      default: [],
    },

    profileImage: String,

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  },
);

familyMemberSchema.index({
  ownerId: 1,
  fatherId: 1,
});

familyMemberSchema.index({
  ownerId: 1,
  motherId: 1,
});

familyMemberSchema.index({
  ownerId: 1,
  fullName: 1,
});

export const FamilyMember = model<IFamilyMember>(
  "FamilyMember",
  familyMemberSchema,
);