import { type CoordinatorSortBy, type CoordinatorSortOrder } from "../models/coordinator-selection-config.model.js";
export interface CoordinatorSelectionSettings {
    matchCaste: boolean;
    matchGotra: boolean;
    minRating: number;
    minCompletedBookings: number;
    autoAssignmentEnabled: boolean | null;
    sortBy: CoordinatorSortBy;
    sortOrder: CoordinatorSortOrder;
}
export declare class CoordinatorSelectionConfigService {
    static getEffectiveConfig(): Promise<CoordinatorSelectionSettings>;
    static getAdminConfig(): Promise<(import("../models/coordinator-selection-config.model.js").ICoordinatorSelectionConfig & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }) | {
        isActive: boolean;
        createdAt: null;
        updatedAt: null;
        matchCaste: boolean;
        matchGotra: boolean;
        minRating: number;
        minCompletedBookings: number;
        autoAssignmentEnabled: boolean | null;
        sortBy: CoordinatorSortBy;
        sortOrder: CoordinatorSortOrder;
        key: string;
    }>;
    static updateConfig(params: {
        matchCaste: boolean;
        matchGotra: boolean;
        minRating: number;
        minCompletedBookings: number;
        autoAssignmentEnabled: boolean | null;
        sortBy: CoordinatorSortBy;
        sortOrder: CoordinatorSortOrder;
        isActive: boolean;
        updatedBy: string;
    }): Promise<import("../models/coordinator-selection-config.model.js").ICoordinatorSelectionConfig & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
//# sourceMappingURL=coordinator-selection-config.service.d.ts.map