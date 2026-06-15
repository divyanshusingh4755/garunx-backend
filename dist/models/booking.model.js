import { model, Schema, Types, Document, Model } from "mongoose";
import { Counter } from "./counter.model.js";
const bookingSelectedItemSchema = new Schema({
    itemId: {
        type: Schema.Types.ObjectId,
        ref: "ComponentItem",
        required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, default: 0, min: 0 },
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
        itemsTotal: { type: Number, default: 0, min: 0 },
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
        subtotal: { type: Number, default: 0 },
        taxes: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
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
    services: {
        type: [bookingServiceConfigurationSchema],
        default: [],
    },
    addonServices: {
        type: [bookingServiceConfigurationSchema],
        default: [],
    },
    pricing: {
        subtotal: { type: Number, default: 0 },
        taxes: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
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
const bookingSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    subAdminId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    cartId: {
        type: Schema.Types.ObjectId,
        ref: "Cart",
        required: true,
        index: true,
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
    customerDetails: {
        name: { type: String, required: true },
        email: { type: String, lowercase: true, trim: true, required: true },
        phone: { type: String, required: true },
        address: String,
        caste: String,
        gotra: String,
    },
    pricing: {
        subtotal: { type: Number, required: true, min: 0 },
        taxes: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        grandTotal: { type: Number, required: true, min: 0 },
        earnings: { type: Number, default: 0 },
    },
    payment: {
        status: {
            type: String,
            enum: ["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIAL_REFUND"],
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
        enum: ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
        default: "PENDING",
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
    },
    lifecycle: {
        confirmedAt: Date,
        completedAt: Date,
        cancelledAt: Date,
        expiredAt: Date,
        confirmedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        completedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    scheduledAt: Date,
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
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ scheduledAt: 1, status: 1 });
bookingSchema.index({ "payment.status": 1 });
bookingSchema.index({ bookingReference: 1 });
bookingSchema.index({ userId: 1, scheduledAt: 1 });
bookingSchema.index({
    status: 1,
    paymentExpiresAt: 1,
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
bookingSchema.index({ cartId: 1 }, {
    unique: true,
    partialFilterExpression: {
        isDeleted: false,
    },
});
bookingSchema.index({
    "payment.refunds.refundId": 1,
});
export const Booking = model("Booking", bookingSchema);
//# sourceMappingURL=booking.model.js.map