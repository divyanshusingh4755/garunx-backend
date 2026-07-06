import { model, Model, Schema, Types } from "mongoose";
const bookingCoordinatorRequestSchema = new Schema({
    bookingId: {
        type: Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
        index: true,
    },
    coordinatorId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    requestType: {
        type: String,
        enum: [
            "INITIAL_ASSIGNMENT",
            "REASSIGNMENT",
            "AUTO_ASSIGNMENT",
        ],
        default: "INITIAL_ASSIGNMENT",
        required: true,
    },
    priorityOrder: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: [
            "PENDING",
            "ACCEPTED",
            "DECLINED",
            "EXPIRED",
            "AUTO_CLOSED",
            "CANCELLED",
        ],
        default: "PENDING",
        required: true,
    },
    requestedAt: {
        type: Date,
        default: Date.now,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    respondedAt: Date,
    responseReason: {
        type: String,
        trim: true,
        maxLength: 500
    },
    notificationSent: {
        type: Boolean,
        default: false,
    },
    notificationSentAt: {
        type: Date,
    },
    metadata: {
        requestedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        autoAssignmentRule: {
            type: String,
        },
    }
}, {
    timestamps: true,
});
bookingCoordinatorRequestSchema.index({
    bookingId: 1,
    status: 1
});
bookingCoordinatorRequestSchema.index({
    coordinatorId: 1,
    status: 1
});
bookingCoordinatorRequestSchema.index({
    status: 1,
    expiresAt: 1,
});
bookingCoordinatorRequestSchema.index({
    bookingId: 1,
    coordinatorId: 1,
}, {
    unique: true,
    partialFilterExpression: {
        status: "PENDING",
    },
});
bookingCoordinatorRequestSchema.statics.expirePendingRequests = async function () {
    await this.updateMany({
        status: "PENDING",
        expiresAt: { $lte: new Date() }
    }, {
        $set: {
            status: "EXPIRED",
            updatedAt: new Date(),
        }
    });
};
bookingCoordinatorRequestSchema.pre("save", async function () {
    if (["ACCEPTED", "DECLINED"].includes(this.status) &&
        !this.respondedAt) {
        this.respondedAt = new Date();
    }
});
export const BookingCoordinatorRequestModel = model("BookingCoordinatorRequest", bookingCoordinatorRequestSchema);
//# sourceMappingURL=bookingcoordinatorrequest.model.js.map