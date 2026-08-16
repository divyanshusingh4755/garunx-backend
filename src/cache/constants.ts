export const CACHE_TTL_SECONDS = {
    STATE_LIST:
        5 * 60,

    STATE_DETAIL:
        10 * 60,

    USER_LIST:
        2 * 60,

    USER_DETAIL:
        5 * 60,

    CURRENT_USER:
        5 * 60,

    COORDINATOR_LIST:
        2 * 60,

    COORDINATOR_DETAIL:
        5 * 60,

    BRANDING_THEME:
        60 * 60,

    LOCATION_LIST:
        5 * 60,

    LOCATION_DETAIL:
        10 * 60,

    LOCATION_IDS:
        5 * 60,

    CITY_LIST:
        5 * 60,

    CITY_DETAIL:
        10 * 60,

    SERVICE_LIST:
        3 * 60,

    SERVICE_DETAIL:
        5 * 60,

    SERVICE_FULL:
        5 * 60,

    SERVICE_BY_LOCATION:
        3 * 60,

    SERVICE_FULL_BY_CITIES:
        5 * 60,

    SERVICE_COMPONENTS:
        5 * 60,

    SERVICE_RESOLVED_PRICING:
        2 * 60,

    PACKAGE_LIST:
        3 * 60,

    PACKAGE_DETAIL:
        5 * 60,

    PACKAGE_FULL:
        5 * 60,

    PACKAGE_FULL_BY_CITIES:
        5 * 60,

    PACKAGE_RELATED_SERVICES:
        3 * 60,

    PACKAGE_BY_LOCATION:
        3 * 60,

    PACKAGE_TIER_SERVICES:
        5 * 60,

    PACKAGE_RESOLVED_PRICING:
        2 * 60,

    COMPONENT_LIST:
        5 * 60,

    COMPONENT_DETAIL:
        10 * 60,

    COMPONENT_ITEM_LIST:
        5 * 60,

    COMPONENT_ITEM_DETAIL:
        10 * 60,

    BOOKING_LIST:
        60,

    BOOKING_DETAIL:
        30,

    BOOKING_STATS:
        30,

    BOOKING_INVOICE:
        10 * 60,

    FAMILY_TREE:
        5 * 60,

    FAMILY_MEMBER_LIST:
        3 * 60,

    FAMILY_MEMBER_DETAIL:
        5 * 60,

    CATEGORY_LIST:
        5 * 60,

    CATEGORY_DETAIL:
        10 * 60,

    TIER_LIST:
        5 * 60,

    TIER_DETAIL:
        10 * 60,

    SUB_SERVICE_COMPONENT_LIST:
        5 * 60,

    SUB_SERVICE_COMPONENT_DETAIL:
        10 * 60,

    BANNER_LIST:
        10 * 60,

    BANNER_DETAIL:
        15 * 60,

    FAQ_LIST:
        10 * 60,

    FAQ_DETAIL:
        15 * 60,

    COUPON_LIST:
        3 * 60,

    COUPON_DETAIL:
        5 * 60,

    REFERRAL_INFO:
        3 * 60,

    REFERRAL_STATS:
        3 * 60,

    REFERRAL_HISTORY:
        3 * 60,

    REFERRAL_REWARD_LIST:
        2 * 60,

    POLICY_LIST:
        10 * 60,

    POLICY_ACTIVE:
        30 * 60,

    REVIEW_LIST:
        2 * 60,

    MY_BOOKING_REVIEW:
        30,

    MY_REVIEW_LIST:
        2 * 60,

    COORDINATOR_REVIEW_LIST:
        2 * 60,

    USER_QUERY_MY_LIST:
        60,

    USER_QUERY_USER_DETAIL:
        30,

    USER_QUERY_ADMIN_LIST:
        60,

    USER_QUERY_ADMIN_DETAIL:
        30,

    TAX_PROFILE_LIST:
        5 * 60,

    ACTIVE_TAX_PROFILE_LIST:
        5 * 60,

    TAX_PROFILE_DETAIL:
        10 * 60,

    CHAT_PARTICIPANT_IDS:
        5 * 60,

    RBAC_PERMISSION_LIST:
        10 * 60,

    RBAC_PERMISSION_DETAIL:
        15 * 60,

    RBAC_ROLE_LIST:
        10 * 60,

    RBAC_ROLE_DETAIL:
        15 * 60,

    RBAC_USER_ACCESS:
        2 * 60,
} as const;

export const CACHE_PREFIX =
    process.env.REDIS_CACHE_PREFIX
        ?.trim() ||
    "garunx:cache:v1";