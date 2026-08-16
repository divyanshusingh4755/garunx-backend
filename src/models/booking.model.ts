import { model, Schema, Types, Document, Model } from "mongoose";
import { Counter } from "./counter.model.js";
import type { ICart } from "./cart.model.js";

import type { ILineTax, ITaxSummary } from "../types/tax.types.js";

import { lineTaxSchema } from "./tax.schema.js";

export type RescheduledByRole = "USER" | "ADMIN" | "SUBADMIN";

export type ReassignmentStatus =
  | "PENDING_REPLACEMENT"
  | "REPLACEMENT_REQUESTED"
  | "COMPLETED"
  | "FAILED";

export type ReassignmentMode =
  | "AUTO"
  | "NOMINATED";

export type BookingStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "ASSIGNMENT_PENDING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export type BookingFor = "MYSELF" | "OTHER";

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "PARTIAL_REFUND"
  | "REFUNDED";

export type AssignmentStatus =
  | "NOT_STARTED"
  | "PENDING_SELECTION"
  | "PENDING_RESPONSE"
  | "ACCEPTED"
  | "REJECTED"
  | "REASSIGNMENT_REQUESTED";

export type BookingCategory =
  | "UPCOMING"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED"
  | "PAYMENT_PENDING"
  | "EXPIRED";

export type BookingExecutionStage =
  | "NOT_STARTED"
  | "COORDINATOR_ARRIVED"
  | "CUSTOMER_VERIFICATION_PENDING"
  | "SERVICE_EXECUTION"
  | "FINALIZATION"
  | "FINISHED";

export type BookingMilestone =
  | "COORDINATOR_ARRIVED"
  | "OTP_VERIFIED"
  | "SERVICE_STARTED"
  | "CUSTOMER_DETAILS_VERIFIED"
  | "DOCUMENTS_COLLECTED"
  | "FAMILY_TREE_STARTED"
  | "FAMILY_TREE_COMPLETED"
  | "ALL_SERVICES_COMPLETED"
  | "FINAL_REPORT_GENERATED";

export type AssignmentRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "SUPERSEDED"
  | "CANCELLED";

export type AssignmentRequestClosureReason =
  | "ANOTHER_COORDINATOR_ACCEPTED"
  | "REASSIGNMENT_STARTED"
  | "REASSIGNMENT_COMPLETED"
  | "RESCHEDULE_COORDINATOR_CHANGE"
  | "USER_CANCELLED"
  | "SYSTEM_CANCELLED";

export type ReassignmentRequestedByRole =
  | "USER"
  | "ADMIN"
  | "COORDINATOR"
  | "SYSTEM";

export interface IAssignmentRequest {
  _id?: Types.ObjectId;
  coordinatorId: Types.ObjectId;
  status: AssignmentRequestStatus;
  assignmentRound: number;
  closureReason?: AssignmentRequestClosureReason;

  assignmentType: "MANUAL" | "AUTO";

  requestedBy?: Types.ObjectId;
  requestedAt: Date;
  responseDeadlineAt: Date;

  scheduledAt: Date;

  respondedAt?: Date;
  rejectionReason?: string;
}

export type BookedBy = "USER" | "ADMIN" | "SUBADMIN";
export type EntryType = "SERVICE" | "PACKAGE";
export type ComponentType = "DEFAULT" | "ADDON";
export type ServiceRole = "PRIMARY" | "INCLUDED" | "ADDON";

export interface IBookingTierSnapshot {
  tierId: Types.ObjectId;
  name: string;
}

export interface IBookingLocationSnapshot {
  locationId: Types.ObjectId;
  name: string;
}

export interface IBookingReschedule {
  previousScheduledAt?: Date;
  newScheduledAt: Date;
  reason: string;
  rescheduledBy: Types.ObjectId;
  rescheduledByRole: RescheduledByRole;
  rescheduledAt: Date;
}

export interface IBookingCompletion {
  notes?: string;
  proofUrls: string[];
  completedBy: Types.ObjectId;
  completedAt: Date;
}

export interface IBookingMilestone {
  code: BookingMilestone;
  completedAt: Date;
  completedBy?: Types.ObjectId;
  notes?: string;
}

export interface IBookingSelectedItem {
  itemId: Types.ObjectId;
  name: string;
}

export interface IBookingRefund {
  refundId: string;
  amount: number;
  reason: string;
  refundedAt: Date;
  providerRefundId?: string;
  status?: "PENDING" | "SUCCESS" | "FAILED";
  refundedBy?: Types.ObjectId;
}

export type ServiceExecutionStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "SKIPPED"
  | "CANCELLED";

export interface IServiceExecution {
  executionId: string;
  serviceId: Types.ObjectId;
  status: ServiceExecutionStatus;
  startedAt?: Date;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  notes?: string;
}

export interface IBookingTaxSummary extends ITaxSummary {
  supplierStateCode?: string;
  placeOfSupplyStateCode?: string;
}

export interface IPendingReschedule {
  previousScheduledAt?: Date;
  requestedScheduledAt: Date;
  reason: string;
  requestedBy: Types.ObjectId;
  requestedAt: Date;
  assignmentRound: number;
}

const pendingRescheduleSchema = new Schema<IPendingReschedule>(
  {
    previousScheduledAt: {
      type: Date,
    },

    requestedScheduledAt: {
      type: Date,
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    requestedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    assignmentRound: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    _id: false,
  },
);

const assignmentRequestSchema = new Schema<IAssignmentRequest>(
  {
    coordinatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "ACCEPTED",
        "REJECTED",
        "EXPIRED",
        "SUPERSEDED",
        "CANCELLED",
      ] satisfies AssignmentRequestStatus[],
      default: "PENDING",
      required: true,
    },

    assignmentRound: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    closureReason: {
      type: String,
      enum: [
        "ANOTHER_COORDINATOR_ACCEPTED",
        "REASSIGNMENT_STARTED",
        "RESCHEDULE_COORDINATOR_CHANGE",
        "USER_CANCELLED",
        "SYSTEM_CANCELLED",
      ],
    },

    assignmentType: {
      type: String,
      enum: ["MANUAL", "AUTO"],
      required: true,
    },

    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    requestedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    responseDeadlineAt: {
      type: Date,
      required: true,
    },

    scheduledAt: {
      type: Date,
      required: true,
    },

    respondedAt: Date,

    rejectionReason: {
      type: String,
      maxlength: 500,
    },
  },
  { _id: true },
);

const serviceExecutionSchema = new Schema<IServiceExecution>(
  {
    executionId: {
      type: String,
      required: true,
    },

    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "IN_PROGRESS",
        "COMPLETED",
        "SKIPPED",
        "CANCELLED",
      ] satisfies ServiceExecutionStatus[],
      default: "PENDING",
    },

    startedAt: Date,
    completedAt: {
      type: Date,
    },

    completedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    notes: {
      type: String,
      maxlength: 500,
    },
  },
  { _id: false },
);

const bookingSelectedItemSchema = new Schema<IBookingSelectedItem>(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "ComponentItem",
      required: true,
    },
    name: { type: String, required: true },
  },
  { _id: false },
);

export interface IBookingComponent {
  componentType: ComponentType;
  componentId: Types.ObjectId;
  serviceComponentId?: Types.ObjectId;

  name: string;
  description?: string;
  imageUrl?: string;

  isRequired: boolean;
  isRemovable: boolean;
  isBundled: boolean;
  selected: boolean;

  selectedItems: IBookingSelectedItem[];

  pricing: {
    priceBeforeDiscount: number;
    discountAmount: number;
    finalAmount: number;
    tax?: ILineTax;
  };
}

const bookingRefundSchema = new Schema<IBookingRefund>(
  {
    refundId: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    refundedAt: {
      type: Date,
      default: Date.now,
    },

    providerRefundId: {
      type: String,
    },

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },

    refundedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false },
);

const bookingTaxSummarySchema = new Schema<IBookingTaxSummary>(
  {
    taxableAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    cgstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    sgstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    igstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalTax: {
      type: Number,
      default: 0,
      min: 0,
    },

    supplierStateCode: {
      type: String,
      trim: true,
      match: /^\d{2}$/,
    },

    placeOfSupplyStateCode: {
      type: String,
      trim: true,
      match: /^\d{2}$/,
    },
  },
  {
    _id: false,
  },
);

const bookingComponentSchema = new Schema<IBookingComponent>(
  {
    componentType: {
      type: String,
      enum: ["DEFAULT", "ADDON"],
      required: true,
    },

    componentId: {
      type: Schema.Types.ObjectId,
      ref: "Component",
      required: true,
    },

    serviceComponentId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceComponent",
    },

    name: { type: String, required: true },
    description: String,

    imageUrl: {
      type: String,
      trim: true,
    },

    isRequired: { type: Boolean, default: false },
    isRemovable: { type: Boolean, default: true },
    isBundled: { type: Boolean, default: false },

    selected: { type: Boolean, default: true },

    selectedItems: {
      type: [bookingSelectedItemSchema],
      default: [],
    },

    pricing: {
      priceBeforeDiscount: {
        type: Number,
        required: true,
        min: 0,
      },

      discountAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      finalAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      tax: {
        type: lineTaxSchema,
        default: undefined,
      },
    },
  },
  { _id: false },
);

export interface IBookingServiceConfiguration {
  serviceId: Types.ObjectId;
  serviceSnapshot: {
    name: string;
    shortDescription?: string;
    thumbnailImage?: string;
    serviceReference?: string;
  };

  serviceRole: ServiceRole;
  subService?: {
    subServiceId: Types.ObjectId;
    name: string;
  };

  tier: {
    tierId: Types.ObjectId;
    name: string;
  };

  location: {
    locationId: Types.ObjectId;
    name: string;
  };

  components: IBookingComponent[];
  pricing: {
    priceBeforeDiscount: number;
    discountAmount: number;
    finalAmount: number;

    tax?: ILineTax;
    taxSummary: IBookingTaxSummary;
  };
}

const bookingServiceConfigurationSchema =
  new Schema<IBookingServiceConfiguration>(
    {
      serviceId: {
        type: Schema.Types.ObjectId,
        ref: "Service",
        required: true,
      },

      serviceSnapshot: {
        name: { type: String, required: true },
        shortDescription: String,
        thumbnailImage: String,
        serviceReference: String,
      },

      serviceRole: {
        type: String,
        enum: ["PRIMARY", "INCLUDED", "ADDON"],
        default: "PRIMARY",
      },

      subService: {
        subServiceId: {
          type: Schema.Types.ObjectId,
          ref: "SubServiceComponent",
        },
        name: String,
      },

      tier: {
        tierId: {
          type: Schema.Types.ObjectId,
          ref: "Tier",
          required: true,
        },
        name: { type: String, required: true },
      },

      location: {
        locationId: {
          type: Schema.Types.ObjectId,
          ref: "Location",
          required: true,
        },
        name: { type: String, required: true },
      },

      components: {
        type: [bookingComponentSchema],
        default: [],
      },

      pricing: {
        priceBeforeDiscount: {
          type: Number,
          default: 0,
          min: 0,
        },

        discountAmount: {
          type: Number,
          default: 0,
          min: 0,
        },

        finalAmount: {
          type: Number,
          default: 0,
          min: 0,
        },

        tax: {
          type: lineTaxSchema,
          default: undefined,
        },

        taxSummary: {
          type: bookingTaxSummarySchema,
          default: () => ({
            taxableAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            cessAmount: 0,
            totalTax: 0,
          }),
        },
      },
    },
    { _id: false },
  );

export interface IBookingPackageConfiguration {
  packageId: Types.ObjectId;

  packageSnapshot: {
    name: string;
    shortDescription?: string;
    thumbnailImage?: string;
    packageReference?: string;
  };

  selectedServices: IBookingServiceConfiguration[];
  addonServices: IBookingServiceConfiguration[];

  pricing: {
    baseAmount: number;
    addonAmount: number;
    subtotal: number;
    discountAmount: number;
    taxSummary: IBookingTaxSummary;
    grandTotal: number;
  };
}

export interface IReassignment {
  requestedBy: Types.ObjectId;

  requestedByRole: ReassignmentRequestedByRole;

  reason: string;

  requestedAt: Date;

  previousCoordinatorId: Types.ObjectId;

  replacementCoordinatorId?: Types.ObjectId;

  assignmentRound: number;

  mode: "AUTO" | "NOMINATED";

  status:
  | "PENDING_REPLACEMENT"
  | "REPLACEMENT_REQUESTED"
  | "COMPLETED"
  | "FAILED";

  completedAt?: Date;

  failedAt?: Date;

  failureReason?: string;
}

const bookingPackageConfigurationSchema =
  new Schema<IBookingPackageConfiguration>(
    {
      packageId: {
        type: Schema.Types.ObjectId,
        ref: "Package",
        required: true,
      },

      packageSnapshot: {
        name: String,
        shortDescription: String,
        thumbnailImage: String,
        packageReference: String,
      },

      selectedServices: {
        type: [bookingServiceConfigurationSchema],
        default: [],
      },

      addonServices: {
        type: [bookingServiceConfigurationSchema],
        default: [],
      },

      pricing: {
        baseAmount: {
          type: Number,
          default: 0,
          min: 0,
        },

        addonAmount: {
          type: Number,
          default: 0,
          min: 0,
        },

        subtotal: {
          type: Number,
          default: 0,
          min: 0,
        },

        discountAmount: {
          type: Number,
          default: 0,
          min: 0,
        },

        taxSummary: {
          type: bookingTaxSummarySchema,
          default: () => ({
            taxableAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            totalTax: 0,
          }),
        },

        grandTotal: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    },
    { _id: false },
  );

export interface IBookingEntry {
  entryType: EntryType;
  serviceConfiguration?: IBookingServiceConfiguration;
  packageConfiguration?: IBookingPackageConfiguration;
}

const bookingEntrySchema = new Schema<IBookingEntry>(
  {
    entryType: {
      type: String,
      enum: ["SERVICE", "PACKAGE"],
      required: true,
    },

    serviceConfiguration: bookingServiceConfigurationSchema,
    packageConfiguration: bookingPackageConfigurationSchema,
  },
  { _id: false },
);

const bookingMilestoneSchema = new Schema<IBookingMilestone>(
  {
    code: {
      type: String,
      enum: [
        "COORDINATOR_ARRIVED",
        "OTP_VERIFIED",
        "SERVICE_STARTED",
        "CUSTOMER_DETAILS_VERIFIED",
        "DOCUMENTS_COLLECTED",
        "FAMILY_TREE_STARTED",
        "FAMILY_TREE_COMPLETED",
        "ALL_SERVICES_COMPLETED",
        "FINAL_REPORT_GENERATED",
      ],
      required: true,
    },

    completedAt: Date,

    completedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    notes: {
      type: String,
      maxlength: 500,
    },
  },
  { _id: false },
);

const bookingRescheduleSchema = new Schema<IBookingReschedule>(
  {
    previousScheduledAt: Date,

    newScheduledAt: {
      type: Date,
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    rescheduledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    rescheduledByRole: {
      type: String,
      enum: ["USER", "ADMIN", "SUBADMIN"],
      required: true,
    },

    rescheduledAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const bookingTierSnapshotSchema =
  new Schema<IBookingTierSnapshot>(
    {
      tierId: {
        type: Schema.Types.ObjectId,
        ref: "Tier",
        required: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },
    },
    {
      _id: false,
    },
  );

const bookingLocationSnapshotSchema =
  new Schema<IBookingLocationSnapshot>(
    {
      locationId: {
        type: Schema.Types.ObjectId,
        ref: "Location",
        required: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },
    },
    {
      _id: false,
    },
  );

const reassignmentSchema = new Schema<IReassignment>(
  {
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    requestedByRole: {
      type: String,
      enum: [
        "USER",
        "COORDINATOR",
        "ADMIN",
        "SYSTEM",
      ] as ReassignmentRequestedByRole[],
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    requestedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    previousCoordinatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    replacementCoordinatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    assignmentRound: {
      type: Number,
      required: true,
      min: 1,
    },

    mode: {
      type: String,
      enum: [
        "AUTO",
        "NOMINATED",
      ],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING_REPLACEMENT",
        "REPLACEMENT_REQUESTED",
        "COMPLETED",
        "FAILED",
      ],
      required: true,
    },

    completedAt: {
      type: Date,
    },

    failedAt: {
      type: Date,
    },

    failureReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    _id: false,
  },
);


export interface IBooking extends Document {
  userId?: Types.ObjectId;
  cartId: Types.ObjectId;
  bookingReference: string;
  bookedBy: BookedBy;
  entries: IBookingEntry[];
  bookingFor: BookingFor;

  tierSnapshot: IBookingTierSnapshot;
  locationSnapshot: IBookingLocationSnapshot;

  beneficiaryUserId?: Types.ObjectId;
  beneficiaryAccess?: {
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
  };

  customerDetails: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    caste?: string;
    gotra?: string;
  };

  pricing: {
    baseAmount: number;
    addonAmount: number;
    subtotal: number;

    couponId?: Types.ObjectId;
    couponCode?: string;

    discountAmount: number;

    taxSummary: IBookingTaxSummary;

    grandTotal: number;
    earnings?: number;
  };

  execution?: {
    stage: BookingExecutionStage;
    startedAt?: Date;
    finishedAt?: Date;

    otpVerification?: {
      status: "PENDING" | "VERIFIED" | "FAILED" | "EXPIRED";

      otpHash?: string;
      expiresAt?: Date;
      generatedAt?: Date;

      verifiedAt?: Date;
      verifiedBy?: Types.ObjectId;

      attempts?: number;
      resendCount?: number;
      lastSentAt?: Date;
    };

    serviceExecutions: IServiceExecution[];
    milestones: IBookingMilestone[];
    progressPercentage?: number;
    completion?: IBookingCompletion;
  };

  payment: {
    status: PaymentStatus;
    paymentMethod?: string;
    gateway?: string;
    amountPaid?: number;
    refundAmount?: number;
    refundReservedAmount?: number;
    paidAt?: Date;
    refundedAt?: Date;
    currency?: string;
    providerOrderId?: string;
    providerPaymentId?: string;
    paymentSessionId?: string;
    attempts?: number;
    lastAttemptAt?: Date;
    failureReason?: string;
    refunds?: IBookingRefund[];
  };

  status: BookingStatus;
  cancellation?: {
    reason?: string;
    cancelledBy?: Types.ObjectId;
    cancelledByRole?: "USER" | "ADMIN" | "SUBADMIN" | "SYSTEM";
    cancelledAt?: Date;
    refundPercentage?: number;
    refundAmount?: number;
  };

  assignment?: {
    status: AssignmentStatus;
    assignedCoordinatorId?: Types.ObjectId;
    assignedBy?: Types.ObjectId;
    assignedAt?: Date;
    assignmentType?: "MANUAL" | "AUTO";
    coordinatorAcceptedAt?: Date;
    responseDeadlineAt?: Date;
    assignmentExpiresAt?: Date;
    currentRound: number;
    requests: IAssignmentRequest[];
    pendingReschedule?: {
      previousScheduledAt?: Date;
      requestedScheduledAt: Date;
      reason: string;
      requestedBy: Types.ObjectId;
      requestedAt: Date;
      assignmentRound: number;
    };
    reassignment?: IReassignment;
  };

  scheduledAt?: Date;

  rescheduleHistory?: IBookingReschedule[];

  completedAt?: Date;
  notes?: string;
  cartSnapshot?: Partial<ICart>;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
  paymentExpiresAt?: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },

    cartId: {
      type: Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
    },

    tierSnapshot: {
      type: bookingTierSnapshotSchema,
      required: true,
    },

    locationSnapshot: {
      type: bookingLocationSnapshotSchema,
      required: true,
    },

    bookingReference: {
      type: String,
      unique: true,
      index: true,
    },

    bookedBy: {
      type: String,
      enum: ["USER", "ADMIN", "SUBADMIN"],
      default: "USER",
    },

    entries: {
      type: [bookingEntrySchema],
      required: true,
      validate: {
        validator: (v: IBookingEntry[]) => v.length > 0,
        message: "Booking must contain at least one entry",
      },
    },

    bookingFor: {
      type: String,
      enum: ["MYSELF", "OTHER"] as BookingFor[],
      default: "MYSELF",
      required: true,
    },

    beneficiaryUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    beneficiaryAccess: {
      tokenHash: {
        type: String,
        select: false,
      },

      expiresAt: Date,
      createdAt: Date,
    },

    customerDetails: {
      name: String,
      email: { type: String, lowercase: true, trim: true },
      phone: String,
      address: String,
      caste: String,
      gotra: String,
    },

    pricing: {
      baseAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      addonAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },

      couponId: {
        type: Schema.Types.ObjectId,
        ref: "Coupon",
      },

      couponCode: {
        type: String,
        uppercase: true,
        trim: true,
      },

      discountAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      taxSummary: {
        type: bookingTaxSummarySchema,
        default: () => ({
          taxableAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalTax: 0,
        }),
      },

      grandTotal: {
        type: Number,
        required: true,
        min: 0,
      },

      earnings: {
        type: Number,
        default: 0,
      },
    },

    payment: {
      status: {
        type: String,
        enum: [
          "PENDING",
          "PROCESSING",
          "PAID",
          "FAILED",
          "PARTIAL_REFUND",
          "REFUNDED",
        ] satisfies PaymentStatus[],
        default: "PENDING",
      },
      providerOrderId: String,
      providerPaymentId: String,
      paymentSessionId: String,
      paymentMethod: String,
      gateway: String,
      attempts: {
        type: Number,
        default: 0,
      },
      lastAttemptAt: Date,
      failureReason: String,
      amountPaid: {
        type: Number,
        default: 0,
      },
      refundAmount: {
        type: Number,
        default: 0,
      },
      refundReservedAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      refunds: {
        type: [bookingRefundSchema],
        default: [],
      },
      paidAt: Date,
      refundedAt: Date,
      currency: {
        type: String,
        default: "INR",
      },
    },

    status: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "CONFIRMED",
        "ASSIGNMENT_PENDING",
        "ASSIGNED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        "EXPIRED",
      ] satisfies BookingStatus[],
      default: "PENDING_PAYMENT",
      index: true,
    },

    cancellation: {
      reason: String,
      cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
      cancelledByRole: {
        type: String,
        enum: ["USER", "ADMIN", "SUBADMIN", "SYSTEM"],
      },
      cancelledAt: Date,
      refundPercentage: Number,
      refundAmount: Number,
    },

    assignment: {
      status: {
        type: String,
        enum: [
          "NOT_STARTED",
          "PENDING_SELECTION",
          "PENDING_RESPONSE",
          "ACCEPTED",
          "REJECTED",
          "REASSIGNMENT_REQUESTED",
        ] satisfies AssignmentStatus[],
        default: "NOT_STARTED",
      },

      assignedCoordinatorId: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      assignedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      assignedAt: Date,

      assignmentType: {
        type: String,
        enum: ["MANUAL", "AUTO"],
      },

      coordinatorAcceptedAt: Date,

      // deadline for one coordinator
      responseDeadlineAt: Date,

      // deadline for customer to manually select the first coordinator
      assignmentExpiresAt: Date,

      currentRound: {
        type: Number,
        default: 1,
        min: 1,
      },

      requests: {
        type: [assignmentRequestSchema],
        default: [],
      },

      pendingReschedule: {
        type: pendingRescheduleSchema,
        default: undefined,
      },

      reassignment: {
        type: reassignmentSchema,
        default: undefined,
      },
    },

    execution: {
      stage: {
        type: String,
        enum: [
          "NOT_STARTED",
          "COORDINATOR_ARRIVED",
          "CUSTOMER_VERIFICATION_PENDING",
          "SERVICE_EXECUTION",
          "FINALIZATION",
          "FINISHED",
        ],
        default: "NOT_STARTED",
      },

      startedAt: Date,
      finishedAt: Date,

      otpVerification: {
        status: {
          type: String,
          enum: ["PENDING", "VERIFIED", "FAILED", "EXPIRED"],
          default: "PENDING",
        },

        otpHash: {
          type: String,
          select: false,
        },

        expiresAt: Date,
        generatedAt: Date,

        verifiedAt: Date,

        verifiedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },

        attempts: {
          type: Number,
          default: 0,
        },

        resendCount: {
          type: Number,
          default: 0,
        },

        lastSentAt: Date,
      },

      milestones: {
        type: [bookingMilestoneSchema],
        default: [],
      },

      serviceExecutions: {
        type: [serviceExecutionSchema],
        default: [],
      },

      progressPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      completion: {
        notes: {
          type: String,
          trim: true,
          maxlength: 2000,
        },

        proofUrls: {
          type: [String],
          default: [],
        },

        completedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },

        completedAt: Date,
      },
    },

    rescheduleHistory: {
      type: [bookingRescheduleSchema],
      default: [],
    },

    scheduledAt: Date,
    completedAt: Date,
    notes: { type: String, maxlength: 1000 },
    cartSnapshot: Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
    paymentExpiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

bookingSchema.pre("save", async function () {
  if (!this.isNew) return;

  const counter = await Counter.findOneAndUpdate(
    { id: "bookingId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  if (!counter) {
    throw new Error("Failed to generate booking reference");
  }

  this.bookingReference = `BK-${counter.seq.toString().padStart(6, "0")}`;
});

bookingEntrySchema.pre("validate", function () {
  const hasServiceConfiguration = Boolean(this.serviceConfiguration);

  const hasPackageConfiguration = Boolean(this.packageConfiguration);

  if (this.entryType === "SERVICE") {
    if (!hasServiceConfiguration || hasPackageConfiguration) {
      throw new Error("SERVICE entry must contain only serviceConfiguration");
    }
  }

  if (this.entryType === "PACKAGE") {
    if (!hasPackageConfiguration || hasServiceConfiguration) {
      throw new Error("PACKAGE entry must contain only packageConfiguration");
    }
  }
});

bookingSchema.pre("validate", function () {
  const hasCouponId = !!this.pricing?.couponId;
  const hasCouponCode = !!this.pricing?.couponCode;

  if (hasCouponId !== hasCouponCode) {
    throw new Error(
      "pricing.couponId and pricing.couponCode must be provided together",
    );
  }
});

bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ scheduledAt: 1, status: 1 });
bookingSchema.index({ "payment.status": 1 });
bookingSchema.index({ userId: 1, scheduledAt: 1 });
bookingSchema.index({
  status: 1,
  paymentExpiresAt: 1,
});

bookingSchema.index(
  { cartId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
    },
  },
);

bookingSchema.index(
  {
    "payment.refunds.refundId": 1,
  },
  {
    unique: true,
    sparse: true,
  },
);

// Index for searching by main customer details email
bookingSchema.index({ userId: 1, isDeleted: 1, "customerDetails.email": 1 });

// Index for searching by main customer details phone
bookingSchema.index({ userId: 1, isDeleted: 1, "customerDetails.phone": 1 });

// Index for searching by snapshot email
bookingSchema.index({
  userId: 1,
  isDeleted: 1,
  "cartSnapshot.customerDetails.email": 1,
});

// Index for searching by snapshot phone
bookingSchema.index({
  userId: 1,
  isDeleted: 1,
  "cartSnapshot.customerDetails.phone": 1,
});

bookingSchema.index(
  {
    bookingReference: "text",
    "customerDetails.name": "text",
    "customerDetails.email": "text",
    "customerDetails.phone": "text",
  },
  {
    name: "BookingTextSearchIndex",
  },
);

bookingSchema.index({
  "assignment.status": 1,
  "assignment.responseDeadlineAt": 1,
});

bookingSchema.index({
  "assignment.assignedCoordinatorId": 1,
  status: 1,
  scheduledAt: 1,
});

bookingSchema.index({
  "assignment.status": 1,
  "assignment.assignmentExpiresAt": 1,
});

bookingSchema.index({
  beneficiaryUserId: 1,
  status: 1,
});

bookingSchema.index({
  bookingFor: 1,
  "customerDetails.email": 1,
});

bookingSchema.index({
  bookingFor: 1,
  "customerDetails.phone": 1,
});

export const Booking: Model<IBooking> = model<IBooking>(
  "Booking",
  bookingSchema,
);
