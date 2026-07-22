import { model, Schema, Types, Document, Model } from "mongoose";
import { Counter } from "./counter.model.js";
const assignmentRequestSchema = new Schema({
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
            "CANCELLED",
        ],
        default: "PENDING",
        required: true,
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
    respondedAt: Date,
    rejectionReason: {
        type: String,
        maxlength: 500,
    },
}, { _id: true });
const serviceExecutionSchema = new Schema({
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
        ],
        default: "PENDING",
    },
    startedAt: Date,
    completedAt: Date,
    completedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    notes: {
        type: String,
        maxlength: 500,
    },
}, { _id: false });
const bookingSelectedItemSchema = new Schema({
    itemId: {
        type: Schema.Types.ObjectId,
        ref: "ComponentItem",
        required: true,
    },
    name: { type: String, required: true },
}, { _id: false });
const bookingRefundSchema = new Schema({
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
}, { _id: false });
const bookingComponentSchema = new Schema({
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
    isRequired: { type: Boolean, default: false },
    isRemovable: { type: Boolean, default: true },
    isBundled: { type: Boolean, default: false },
    selected: { type: Boolean, default: true },
    selectedItems: {
        type: [bookingSelectedItemSchema],
        default: [],
    },
    pricing: {
        basePrice: { type: Number, default: 0, min: 0 },
        total: { type: Number, default: 0, min: 0 },
    },
}, { _id: false });
const bookingServiceConfigurationSchema = new Schema({
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
        taxes: { type: Number, default: 0 },
        grandTotal: { type: Number, default: 0 },
    },
}, { _id: false });
const bookingPackageConfigurationSchema = new Schema({
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
        taxes: { type: Number, default: 0 },
        grandTotal: { type: Number, default: 0 },
    },
}, { _id: false });
const bookingEntrySchema = new Schema({
    entryType: {
        type: String,
        enum: ["SERVICE", "PACKAGE"],
        required: true,
    },
    serviceConfiguration: bookingServiceConfigurationSchema,
    packageConfiguration: bookingPackageConfigurationSchema,
}, { _id: false });
const bookingMilestoneSchema = new Schema({
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
            "CUSTOMER_CONFIRMATION_RECEIVED",
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
}, { _id: false });
const bookingSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    cartId: {
        type: Schema.Types.ObjectId,
        ref: "Cart",
        required: true,
    },
    bookingReference: {
        type: String,
        unique: true,
        index: true,
    },
    bookedBy: {
        type: String,
        enum: ["CUSTOMER", "ADMIN", "SUBADMIN"],
        default: "CUSTOMER",
    },
    entries: {
        type: [bookingEntrySchema],
        required: true,
        validate: {
            validator: (v) => v.length > 0,
            message: "Booking must contain at least one entry",
        },
    },
    bookingFor: {
        type: String,
        enum: ["MYSELF", "OTHER"],
        default: "MYSELF",
        required: true,
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
        taxes: {
            type: Number,
            default: 0,
            min: 0,
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
            ],
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
        ],
        default: "PENDING_PAYMENT",
        index: true,
    },
    cancellation: {
        reason: String,
        cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
        cancelledByRole: {
            type: String,
            enum: ["CUSTOMER", "ADMIN", "SUBADMIN", "SYSTEM"],
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
            ],
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
        // final deadline for the complete coordinator-selection process
        assignmentExpiresAt: Date,
        requests: {
            type: [assignmentRequestSchema],
            default: [],
        },
        reassignment: {
            requestedBy: {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
            requestedByRole: {
                type: String,
                enum: [
                    "CUSTOMER",
                    "COORDINATOR",
                    "ADMIN",
                    "SYSTEM",
                ],
                default: "CUSTOMER",
            },
            reason: String,
            requestedAt: Date,
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
                "CUSTOMER_REVIEW_PENDING",
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
                enum: [
                    "PENDING",
                    "VERIFIED",
                    "FAILED",
                    "EXPIRED",
                ],
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
}, {
    timestamps: true,
});
bookingSchema.pre("save", async function () {
    if (!this.isNew)
        return;
    const counter = await Counter.findOneAndUpdate({ id: "bookingId" }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    if (!counter) {
        throw new Error("Failed to generate booking reference");
    }
    this.bookingReference = `BK-${counter.seq.toString().padStart(6, "0")}`;
});
bookingEntrySchema.pre("validate", function () {
    if (this.entryType === "SERVICE" && !this.serviceConfiguration) {
        throw new Error("SERVICE entry requires serviceConfiguration");
    }
    if (this.entryType === "PACKAGE" && !this.packageConfiguration) {
        throw new Error("PACKAGE entry requires packageConfiguration");
    }
});
bookingSchema.pre("validate", function () {
    const hasCouponId = !!this.pricing?.couponId;
    const hasCouponCode = !!this.pricing?.couponCode;
    if (hasCouponId !== hasCouponCode) {
        throw new Error("pricing.couponId and pricing.couponCode must be provided together");
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
bookingSchema.index({ cartId: 1 }, {
    unique: true,
    partialFilterExpression: {
        isDeleted: false,
    },
});
bookingSchema.index({
    "payment.refunds.refundId": 1,
});
// Index for searching by main customer details email
bookingSchema.index({ userId: 1, isDeleted: 1, "customerDetails.email": 1 });
// Index for searching by main customer details phone
bookingSchema.index({ userId: 1, isDeleted: 1, "customerDetails.phone": 1 });
// Index for searching by snapshot email
bookingSchema.index({ userId: 1, isDeleted: 1, "cartSnapshot.customerDetails.email": 1 });
// Index for searching by snapshot phone
bookingSchema.index({ userId: 1, isDeleted: 1, "cartSnapshot.customerDetails.phone": 1 });
bookingSchema.index({
    bookingReference: "text",
    "customerDetails.name": "text",
    "customerDetails.email": "text",
    "customerDetails.phone": "text",
}, {
    name: "BookingTextSearchIndex",
});
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
export const Booking = model("Booking", bookingSchema);
//# sourceMappingURL=booking.model.js.map