import { CoordinatorSelectionConfig } from "../models/coordinator-selection-config.model.js";
const DEFAULT_SETTINGS = {
    matchCaste: false,
    matchGotra: false,
    minRating: 0,
    minCompletedBookings: 0,
    autoAssignmentEnabled: null,
    sortBy: "rating",
    sortOrder: "desc",
};
export class CoordinatorSelectionConfigService {
    static async getEffectiveConfig() {
        const config = await CoordinatorSelectionConfig.findOne({ key: "DEFAULT", isActive: true }).lean();
        // Important: Booking flow must continue working even before admin creates the first config.
        if (!config) {
            return DEFAULT_SETTINGS;
        }
        return {
            matchCaste: config.matchCaste,
            matchGotra: config.matchGotra,
            minRating: config.minRating,
            minCompletedBookings: config.minCompletedBookings,
            autoAssignmentEnabled: config.autoAssignmentEnabled ?? null,
            sortBy: config.sortBy,
            sortOrder: config.sortOrder,
        };
    }
    static async getAdminConfig() {
        const config = await CoordinatorSelectionConfig.findOne({ key: "DEFAULT" }).lean();
        if (!config) {
            return { key: "DEFAULT", ...DEFAULT_SETTINGS, isActive: true, createdAt: null, updatedAt: null };
        }
        return config;
    }
    static async updateConfig(params) {
        return CoordinatorSelectionConfig.findOneAndUpdate({ key: "DEFAULT" }, {
            $set: {
                matchCaste: params.matchCaste,
                matchGotra: params.matchGotra,
                minRating: params.minRating,
                minCompletedBookings: params.minCompletedBookings,
                autoAssignmentEnabled: params.autoAssignmentEnabled,
                sortBy: params.sortBy,
                sortOrder: params.sortOrder,
                isActive: params.isActive,
                updatedBy: params.updatedBy,
            },
            $setOnInsert: { key: "DEFAULT" },
        }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }).lean();
    }
}
//# sourceMappingURL=coordinator-selection-config.service.js.map