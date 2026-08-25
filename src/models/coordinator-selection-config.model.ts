import { Schema, model, type Document, type Types } from "mongoose";

export type CoordinatorSortBy = "rating" | "completedBookings" | "acceptanceRate";
export type CoordinatorSortOrder = "asc" | "desc";

export interface ICoordinatorSelectionConfig extends Document {
    key: "DEFAULT";
    matchCaste: boolean;
    matchGotra: boolean;
    minRating: number;
    minCompletedBookings: number;
    // null = don't filter based on this field.
    autoAssignmentEnabled: boolean | null;
    sortBy: CoordinatorSortBy;
    sortOrder: CoordinatorSortOrder;
    isActive: boolean;
    updatedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const coordinatorSelectionConfigSchema = new Schema<ICoordinatorSelectionConfig>(
    {
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
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

export const CoordinatorSelectionConfig = model<ICoordinatorSelectionConfig>("CoordinatorSelectionConfig", coordinatorSelectionConfigSchema);