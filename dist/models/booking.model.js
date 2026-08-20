import { model, Schema, Types, Document, Model } from "mongoose";
import { Counter } from "./counter.model.js";
import { lineTaxSchema } from "./tax.schema.js";
const pendingRescheduleSchema = new Schema({
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
}, {
    _id: false,
});
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
            "SUPERSEDED",
            "CANCELLED",
        ],
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
            "REASSIGNMENT_COMPLETED",
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
const bookingTaxSummarySchema = new Schema({
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
}, {
    _id: false,
});
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
const bookingRescheduleSchema = new Schema({
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
}, {
    _id: false,
});
const bookingTierSnapshotSchema = new Schema({
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
}, {
    _id: false,
});
const bookingLocationSnapshotSchema = new Schema({
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
}, {
    _id: false,
});
const reassignmentSchema = new Schema({
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
        ],
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
}, {
    _id: false,
});
const bookingSchema = new Schema({
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
        ],
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
}, {
    unique: true,
    sparse: true,
});
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
export const Booking = model("Booking", bookingSchema);
//# sourceMappingURL=booking.model.js.map