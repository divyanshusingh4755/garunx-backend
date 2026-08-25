import { Schema, model } from "mongoose";
const coordinatorSelectionConfigSchema = new Schema({
    // Singleton configuration. Later, if you want different configurations per service/location/category, this can be expanded without changing BookingService heavily.
    key: {
        type: String,
        enum: ["DEFAULT"],
        default: "DEFAULT",
        unique: true,
        immutable: true,
    },
    matchCaste: {
        type: Boolean,
        default: false,
    },
    matchGotra: {
        type: Boolean,
        default: false,
    },
    minRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    minCompletedBookings: {
        type: Number,
        default: 0,
        min: 0,
    },
    autoAssignmentEnabled: {
        type: Boolean,
        default: null,
    },
    sortBy: {
        type: String,
        enum: ["rating", "completedBookings", "acceptanceRate"],
        default: "rating",
    },
    sortOrder: {
        type: String,
        enum: ["asc", "desc"],
        default: "desc",
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
}, {
    timestamps: true,
    versionKey: false,
});
export const CoordinatorSelectionConfig = model("CoordinatorSelectionConfig", coordinatorSelectionConfigSchema);
//# sourceMappingURL=coordinator-selection-config.model.js.map