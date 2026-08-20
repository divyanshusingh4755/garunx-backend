export const REQUIRED_NOTIFICATION_CATEGORIES = ["SYSTEM"];
export const OPTIONAL_ONLY_NOTIFICATION_CATEGORIES = ["PROMOTIONAL", "APP_UPDATE", "NEW_FEATURE"];
export const isValidPreferenceModeForCategory = (category, preferenceMode) => {
    // SYSTEM notifications are always required.
    if (REQUIRED_NOTIFICATION_CATEGORIES.includes(category)) {
        return preferenceMode === "REQUIRED";
    }
    // Marketing / informational categories must always respect user preferences
    if (OPTIONAL_ONLY_NOTIFICATION_CATEGORIES.includes(category)) {
        return preferenceMode === "OPTIONAL";
    }
    /*
     * Transactional categories can contain
     * both required and optional notifications.
     *
     * BOOKING
     * PAYMENT
     * QUERY
     * REVIEW
     */
    return true;
};
//# sourceMappingURL=notification-policy.js.map