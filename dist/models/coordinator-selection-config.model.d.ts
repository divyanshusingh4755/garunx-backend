import { type Document, type Types } from "mongoose";
export type CoordinatorSortBy = "rating" | "completedBookings" | "acceptanceRate";
export type CoordinatorSortOrder = "asc" | "desc";
export interface ICoordinatorSelectionConfig extends Document {
    key: "DEFAULT";
    matchCaste: boolean;
    matchGotra: boolean;
    minRating: number;
    minCompletedBookings: number;
    autoAssignmentEnabled: boolean | null;
    sortBy: CoordinatorSortBy;
    sortOrder: CoordinatorSortOrder;
    isActive: boolean;
    updatedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const CoordinatorSelectionConfig: import("mongoose").Model<ICoordinatorSelectionConfig, {}, {}, {}, Document<unknown, {}, ICoordinatorSelectionConfig, {}, import("mongoose").DefaultSchemaOptions> & ICoordinatorSelectionConfig & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ICoordinatorSelectionConfig>;
//# sourceMappingURL=coordinator-selection-config.model.d.ts.map