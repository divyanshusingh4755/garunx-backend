import {
  Schema,
  Types,
  model,
  type Document,
} from "mongoose";

import {
  Role,
} from "../types/rbac.js";

import {
  Counter,
} from "./counter.model.js";

import {
  ApprovalStatus,
  AvailabilityStatus,
  Caste,
  Gender,
  Gotra,
  VerificationStatus,
} from "../types/enums.js";

export interface IRatingSummary {
  averageRating: number;
  totalRatings: number;
  ratingSum: number;
}

export interface IServiceableLocation {
  locationId: Types.ObjectId;
  caste?: Caste[];
  gotra?: Gotra[];
}

export interface ICoordinatorProfile {
  averageRating: number;
  totalRatings: number;
  ratingSum: number;
  totalCompletedBookings: number;
  totalAssignedBookings: number;
  acceptanceRate: number;
  approvalStatus:
    ApprovalStatus;
  approvalRejectionReason?:
    string | null;
  availabilityStatus:
    AvailabilityStatus;
  maxDailyBookings: number;
  autoAssignmentEnabled:
    boolean;
  lastAvailabilityChangedAt?:
    Date;
  serviceableLocations:
    IServiceableLocation[];
}

export interface IDocumentVerification {
  aadharCard?: string;
  panCard?: string;
  status:
    VerificationStatus;
  rejectionReason?:
    string | null;
}

export interface IBankDocumentVerification {
  bankPassbook?: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  ifscCode?: string;
  status:
    VerificationStatus;
  rejectionReason?:
    string | null;
}

export interface IUser
  extends Document {
  phoneNumber?: string;
  email?: string;
  password?: string;
  role: Role;

  otp?: string | null;
  otpExpiresAt?: Date | null;
  isOtpVerified: boolean;
  isActive: boolean;

  fullName?: string;
  dob?: Date;
  gender?: Gender;
  profileImage?:
    string | null;
  isComplete: boolean;
  isResetVerified: boolean;

  referralCode?: string;
  referredBy?:
    Types.ObjectId | null;

  resetPasswordToken?:
    string | null;
  resetPasswordExpires?:
    Date | null;

  savedLocations: string[];

  documentVerification:
    IDocumentVerification;

  bankDocumentVerification:
    IBankDocumentVerification;

  caste?: Caste;
  gotra?: Gotra;

  isDocumentVerified: boolean;
  isBankDocumentVerified:
    boolean;

  userReference: string;

  ratingSummary?:
    IRatingSummary;

  coordinatorProfile?:
    ICoordinatorProfile;

  createdAt: Date;
  updatedAt: Date;
}

const ratingSummarySchema =
  new Schema<IRatingSummary>(
    {
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
        required: true,
      },

      totalRatings: {
        type: Number,
        default: 0,
        min: 0,
        required: true,
      },

      ratingSum: {
        type: Number,
        default: 0,
        min: 0,
        required: true,
      },
    },
    {
      _id: false,
    },
  );

const documentVerificationSchema =
  new Schema<IDocumentVerification>(
    {
      aadharCard: {
        type: String,
      },

      panCard: {
        type: String,
      },

      status: {
        type: String,
        enum:
          Object.values(
            VerificationStatus,
          ),
        default:
          VerificationStatus.PENDING,
        required: true,
      },

      rejectionReason: {
        type: String,
        default: null,
      },
    },
    {
      _id: false,
    },
  );

const bankVerificationSchema =
  new Schema<IBankDocumentVerification>(
    {
      bankPassbook: {
        type: String,
      },

      accountNumber: {
        type: String,
      },

      accountName: {
        type: String,
      },

      bankName: {
        type: String,
      },

      ifscCode: {
        type: String,
      },

      status: {
        type: String,
        enum:
          Object.values(
            VerificationStatus,
          ),
        default:
          VerificationStatus.PENDING,
        required: true,
      },

      rejectionReason: {
        type: String,
        default: null,
      },
    },
    {
      _id: false,
    },
  );

const serviceableLocationSchema =
  new Schema<IServiceableLocation>(
    {
      locationId: {
        type:
          Schema.Types.ObjectId,
        ref: "Location",
        required: true,
      },

      caste: {
        type: [
          {
            type: String,
            enum:
              Object.values(
                Caste,
              ),
          },
        ],
        default: [],
      },

      gotra: {
        type: [
          {
            type: String,
            enum:
              Object.values(
                Gotra,
              ),
          },
        ],
        default: [],
      },
    },
    {
      _id: false,
    },
  );

const coordinatorProfileSchema =
  new Schema<ICoordinatorProfile>(
    {
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
        required: true,
      },

      totalRatings: {
        type: Number,
        default: 0,
        min: 0,
        required: true,
      },

      ratingSum: {
        type: Number,
        default: 0,
        min: 0,
        required: true,
      },

      totalCompletedBookings: {
        type: Number,
        default: 0,
        min: 0,
        required: true,
      },

      totalAssignedBookings: {
        type: Number,
        default: 0,
        min: 0,
        required: true,
      },

      acceptanceRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
        required: true,
      },

      approvalStatus: {
        type: String,
        enum:
          Object.values(
            ApprovalStatus,
          ),
        default:
          ApprovalStatus.PENDING,
        required: true,
      },

      availabilityStatus: {
        type: String,
        enum:
          Object.values(
            AvailabilityStatus,
          ),
        default:
          AvailabilityStatus.AVAILABLE,
        required: true,
      },

      approvalRejectionReason: {
        type: String,
        trim: true,
        default: null,
      },

      maxDailyBookings: {
        type: Number,
        default: 5,
        min: 1,
        required: true,
      },

      autoAssignmentEnabled: {
        type: Boolean,
        default: true,
        required: true,
      },

      lastAvailabilityChangedAt: {
        type: Date,
      },

      serviceableLocations: {
        type: [
          serviceableLocationSchema,
        ],
        default: [],
        validate: {
          validator: (
            locations:
              IServiceableLocation[],
          ): boolean => {
            const ids =
              locations.map(
                (location) =>
                  location.locationId
                    .toString(),
              );

            return (
              new Set(ids).size ===
              ids.length
            );
          },

          message:
            "Duplicate serviceable locations are not allowed",
        },
      },
    },
    {
      _id: false,
    },
  );

const userSchema =
  new Schema<IUser>(
    {
      phoneNumber: {
        type: String,
        trim: true,
      },

      email: {
        type: String,
        lowercase: true,
        trim: true,
      },

      password: {
        type: String,
      },

      role: {
        type: String,
        enum:
          Object.values(Role),
        required: true,
        default: Role.USER,
      },

      otp: {
        type: String,
        default: null,
      },

      otpExpiresAt: {
        type: Date,
        default: null,
      },

      isOtpVerified: {
        type: Boolean,
        default: false,
        required: true,
      },

      isActive: {
        type: Boolean,
        default: true,
        required: true,
      },

      fullName: {
        type: String,
        trim: true,
      },

      dob: {
        type: Date,
      },

      gender: {
        type: String,
        enum:
          Object.values(Gender),
      },

      profileImage: {
        type: String,
        default: null,
      },

      isComplete: {
        type: Boolean,
        default: false,
        required: true,
      },

      isResetVerified: {
        type: Boolean,
        default: false,
        required: true,
      },

      referralCode: {
        type: String,
        trim: true,
      },

      referredBy: {
        type:
          Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      resetPasswordToken: {
        type: String,
        default: null,
      },

      resetPasswordExpires: {
        type: Date,
        default: null,
      },

      savedLocations: {
        type: [
          {
            type: String,
            trim: true,
          },
        ],
        default: [],
      },

      documentVerification: {
        type:
          documentVerificationSchema,
        default: {},
        required: true,
      },

      bankDocumentVerification: {
        type:
          bankVerificationSchema,
        default: {},
        required: true,
      },

      caste: {
        index: true,
        type: String,
        enum:
          Object.values(Caste),
      },

      gotra: {
        index: true,
        type: String,
        enum:
          Object.values(Gotra),
      },

      isDocumentVerified: {
        type: Boolean,
        default: false,
        required: true,
      },

      isBankDocumentVerified: {
        type: Boolean,
        default: false,
        required: true,
      },

      userReference: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      ratingSummary: {
        type:
          ratingSummarySchema,
        default: undefined,
      },

      coordinatorProfile: {
        type:
          coordinatorProfileSchema,
        default: undefined,
      },
    },
    {
      timestamps: true,
    },
  );

userSchema.pre(
  "validate",
  function (): void {
    if (
      !this.phoneNumber &&
      !this.email
    ) {
      throw new Error(
        "Either phoneNumber or email is required",
      );
    }

    if (
      this.resetPasswordToken &&
      !this.resetPasswordExpires
    ) {
      throw new Error(
        "resetPasswordExpires is required when resetPasswordToken is set",
      );
    }

    if (
      !this.resetPasswordToken &&
      this.resetPasswordExpires
    ) {
      throw new Error(
        "resetPasswordToken is required when resetPasswordExpires is set",
      );
    }

    if (
      this.role !==
        Role.COORDINATOR &&
      this.coordinatorProfile
    ) {
      throw new Error(
        "coordinatorProfile can only be set for coordinator users",
      );
    }
  },
);

userSchema.pre(
  "save",
  async function (): Promise<void> {
    if (
      !this.isNew ||
      this.userReference
    ) {
      return;
    }

    const counter =
      await Counter
        .findOneAndUpdate(
          {
            id: "userId",
          },
          {
            $inc: {
              seq: 1,
            },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert:
              true,
          },
        )
        .lean();

    if (!counter) {
      throw new Error(
        "Unable to generate user reference",
      );
    }

    const seqString =
      counter.seq
        .toString()
        .padStart(4, "0");

    this.userReference =
      `GX-${seqString}`;
  },
);

userSchema.index(
  {
    email: 1,
    role: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      email: {
        $type: "string",
      },
    },
  },
);

userSchema.index(
  {
    phoneNumber: 1,
    role: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      phoneNumber: {
        $type: "string",
      },
    },
  },
);

userSchema.index(
  {
    referralCode: 1,
  },
  {
    unique: true,
    sparse: true,
  },
);

userSchema.index(
  {
    createdAt: 1,
  },
  {
    expireAfterSeconds:
      86400,
    partialFilterExpression: {
      isOtpVerified: false,
    },
  },
);

userSchema.index({
  fullName: 1,
});

userSchema.index({
  role: 1,
  createdAt: -1,
});

userSchema.index({
  role: 1,
  isActive: 1,
  isDocumentVerified: 1,
  isBankDocumentVerified: 1,
  "coordinatorProfile.approvalStatus": 1,
  "coordinatorProfile.availabilityStatus": 1,
});

userSchema.index({
  role: 1,
  "coordinatorProfile.averageRating":
    -1,
});

userSchema.index({
  role: 1,
  "coordinatorProfile.serviceableLocations.locationId":
    1,
});

userSchema.index(
  {
    fullName: "text",
    email: "text",
    phoneNumber: "text",
    userReference: "text",
  },
  {
    weights: {
      fullName: 10,
      email: 5,
      phoneNumber: 2,
      userReference: 1,
    },
    name:
      "UserSearchIndex",
  },
);

export const User =
  model<IUser>(
    "User",
    userSchema,
  );
