import { createHash, } from "node:crypto";
import { CACHE_PREFIX, } from "./constants.js";
const hashPayload = (payload) => {
    return createHash("sha256")
        .update(JSON.stringify(payload))
        .digest("hex")
        .slice(0, 24);
};
const normalizeStringArray = (values) => {
    if (!values?.length) {
        return [];
    }
    return [
        ...new Set(values
            .map((value) => value.trim())
            .filter(Boolean)),
    ].sort();
};
const normalizeCsvFilter = (value) => {
    if (!value?.trim()) {
        return [];
    }
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .sort();
};
export const CacheKeys = {
    /*
     * =========================
     * STATE
     * =========================
     */
    stateList(params) {
        const payload = {
            searchTerm: params.searchTerm
                ?.trim() ??
                "",
            countryFilter: normalizeCsvFilter(params.countryFilter),
            stateFilter: normalizeCsvFilter(params.stateFilter),
            limit: params.limit,
            page: params.page,
            isActive: typeof params.isActive ===
                "boolean"
                ? params.isActive
                : null,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:state:list:${hashPayload(payload)}`;
    },
    stateDetail(stateId) {
        return `${CACHE_PREFIX}:state:detail:${stateId}`;
    },
    stateListPattern() {
        return `${CACHE_PREFIX}:state:list:*`;
    },
    /*
     * =========================
     * USER
     * =========================
     */
    userList(params) {
        const payload = {
            page: params.page,
            limit: params.limit,
            role: params.role ??
                null,
            isComplete: typeof params.isComplete ===
                "boolean"
                ? params.isComplete
                : null,
            isActive: typeof params.isActive ===
                "boolean"
                ? params.isActive
                : null,
            search: params.search
                ?.trim()
                .toLowerCase() ??
                "",
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:user:list:${hashPayload(payload)}`;
    },
    userDetail(userId) {
        return `${CACHE_PREFIX}:user:detail:${userId}`;
    },
    currentUser(userId) {
        return `${CACHE_PREFIX}:user:current:${userId}`;
    },
    userListPattern() {
        return `${CACHE_PREFIX}:user:list:*`;
    },
    /*
     * =========================
     * COORDINATOR
     * =========================
     */
    coordinatorList(params) {
        const payload = {
            page: params.page,
            limit: params.limit,
            approvalStatus: params.approvalStatus ??
                null,
            availabilityStatus: params.availabilityStatus ??
                null,
            locationId: params.locationId ??
                null,
            caste: params.caste ??
                null,
            gotra: params.gotra ??
                null,
            autoAssignmentEnabled: typeof params.autoAssignmentEnabled ===
                "boolean"
                ? params.autoAssignmentEnabled
                : null,
            minimumRating: params.minimumRating ??
                null,
            search: params.search
                ?.trim()
                .toLowerCase() ??
                "",
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:coordinator:list:${hashPayload(payload)}`;
    },
    coordinatorDetail(coordinatorId) {
        return `${CACHE_PREFIX}:coordinator:detail:${coordinatorId}`;
    },
    coordinatorListPattern() {
        return `${CACHE_PREFIX}:coordinator:list:*`;
    },
    brandingTheme() {
        return `${CACHE_PREFIX}:branding:theme`;
    },
    locationList(params) {
        const payload = {
            searchTerm: params.searchTerm
                ?.trim()
                .toLowerCase() ??
                "",
            countryFilter: normalizeCsvFilter(params.countryFilter),
            stateIdFilter: normalizeCsvFilter(params.stateIdFilter),
            cityIdFilter: normalizeCsvFilter(params.cityIdFilter),
            pincodeFilter: normalizeCsvFilter(params.pincodeFilter),
            limit: params.limit,
            page: params.page,
            isActive: typeof params.isActive ===
                "boolean"
                ? params.isActive
                : null,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:location:list:${hashPayload(payload)}`;
    },
    locationDetail(locationId) {
        return `${CACHE_PREFIX}:location:detail:${locationId}`;
    },
    locationDetailPattern() {
        return `${CACHE_PREFIX}:location:detail:*`;
    },
    locationListPattern() {
        return `${CACHE_PREFIX}:location:list:*`;
    },
    locationIdsPattern() {
        return `${CACHE_PREFIX}:location:ids:*`;
    },
    locationIds(locationIds) {
        const normalizedIds = [
            ...new Set(locationIds.map((id) => id.trim())),
        ].sort();
        return `${CACHE_PREFIX}:location:ids:${hashPayload(normalizedIds)}`;
    },
    cityList(params) {
        const payload = {
            searchTerm: params.searchTerm
                ?.trim()
                .toLowerCase() ??
                "",
            cityFilter: normalizeCsvFilter(params.cityFilter),
            stateIdFilter: normalizeCsvFilter(params.stateIdFilter),
            countryFilter: normalizeCsvFilter(params.countryFilter),
            limit: params.limit,
            page: params.page,
            isActive: typeof params.isActive ===
                "boolean"
                ? params.isActive
                : null,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:city:list:${hashPayload(payload)}`;
    },
    cityDetail(cityId) {
        return `${CACHE_PREFIX}:city:detail:${cityId}`;
    },
    cityListPattern() {
        return `${CACHE_PREFIX}:city:list:*`;
    },
    cityDetailPattern() {
        return `${CACHE_PREFIX}:city:detail:*`;
    },
    serviceList(params) {
        const payload = {
            searchTerm: params.searchTerm
                ?.trim()
                .toLowerCase() ??
                "",
            categoryId: params.categoryId ??
                null,
            locationId: params.locationId ??
                null,
            limit: params.limit,
            page: params.page,
            isActive: typeof params.isActive ===
                "boolean"
                ? params.isActive
                : null,
            isComplete: typeof params.isComplete ===
                "boolean"
                ? params.isComplete
                : null,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:service:list:${hashPayload(payload)}`;
    },
    serviceByLocationList(params) {
        const payload = {
            cityIds: normalizeStringArray(params.cityIds),
            categoryIds: normalizeStringArray(params.categoryIds),
            limit: params.limit,
            page: params.page,
            isActive: typeof params.isActive ===
                "boolean"
                ? params.isActive
                : null,
            isComplete: typeof params.isComplete ===
                "boolean"
                ? params.isComplete
                : null,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:service:by-location:${hashPayload(payload)}`;
    },
    serviceDetail(serviceId) {
        return `${CACHE_PREFIX}:service:detail:${serviceId}`;
    },
    serviceFull(serviceId) {
        return `${CACHE_PREFIX}:service:full:${serviceId}`;
    },
    serviceFullByCities(serviceId, cityIds) {
        const normalizedCityIds = normalizeStringArray(cityIds);
        return `${CACHE_PREFIX}:service:full-by-cities:${serviceId}:${hashPayload(normalizedCityIds)}`;
    },
    serviceListPattern() {
        return `${CACHE_PREFIX}:service:list:*`;
    },
    serviceByLocationListPattern() {
        return `${CACHE_PREFIX}:service:by-location:*`;
    },
    serviceFullByCitiesPattern(serviceId) {
        return `${CACHE_PREFIX}:service:full-by-cities:${serviceId}:*`;
    },
    serviceDetailPattern() {
        return `${CACHE_PREFIX}:service:detail:*`;
    },
    serviceFullPattern() {
        return `${CACHE_PREFIX}:service:full:*`;
    },
    serviceComponentsByTier(serviceId, tierId) {
        return `${CACHE_PREFIX}:service-component:${serviceId}:tier:${tierId}`;
    },
    serviceComponentsByServicePattern(serviceId) {
        return `${CACHE_PREFIX}:service-component:${serviceId}:tier:*`;
    },
    serviceComponentPattern() {
        return `${CACHE_PREFIX}:service-component:*`;
    },
    serviceResolvedPricing(serviceId, tierId, locationId) {
        return `${CACHE_PREFIX}:service-pricing:resolved:${serviceId}:${tierId}:${locationId}`;
    },
    serviceResolvedPricingByServicePattern(serviceId) {
        return `${CACHE_PREFIX}:service-pricing:resolved:${serviceId}:*`;
    },
    serviceResolvedPricingPattern() {
        return `${CACHE_PREFIX}:service-pricing:resolved:*`;
    },
    packageList(params) {
        const payload = {
            searchTerm: params.searchTerm
                ?.trim()
                .toLowerCase() ??
                "",
            categoryId: params.categoryId ??
                null,
            locationId: params.locationId ??
                null,
            tierId: params.tierId ??
                null,
            limit: params.limit,
            page: params.page,
            isActive: typeof params.isActive ===
                "boolean"
                ? params.isActive
                : null,
            isComplete: typeof params.isComplete ===
                "boolean"
                ? params.isComplete
                : null,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:package:list:${hashPayload(payload)}`;
    },
    packageByLocationList(params) {
        const payload = {
            cityIds: normalizeStringArray(params.cityIds),
            categoryIds: normalizeStringArray(params.categoryIds),
            limit: params.limit,
            page: params.page,
            isActive: typeof params.isActive ===
                "boolean"
                ? params.isActive
                : null,
            isComplete: typeof params.isComplete ===
                "boolean"
                ? params.isComplete
                : null,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:package:by-location:${hashPayload(payload)}`;
    },
    packageDetail(packageId) {
        return `${CACHE_PREFIX}:package:detail:${packageId}`;
    },
    packageFull(packageId) {
        return `${CACHE_PREFIX}:package:full:${packageId}`;
    },
    packageFullByCities(packageId, cityIds) {
        return `${CACHE_PREFIX}:package:full-by-cities:${packageId}:${hashPayload(normalizeStringArray(cityIds))}`;
    },
    packageRelatedServices(packageId, tierId, locationId) {
        return `${CACHE_PREFIX}:package:related:${packageId}:${tierId}:${locationId}`;
    },
    packageListPattern() {
        return `${CACHE_PREFIX}:package:list:*`;
    },
    packageByLocationListPattern() {
        return `${CACHE_PREFIX}:package:by-location:*`;
    },
    packageFullByCitiesPattern(packageId) {
        return `${CACHE_PREFIX}:package:full-by-cities:${packageId}:*`;
    },
    packageRelatedServicesPattern(packageId) {
        return `${CACHE_PREFIX}:package:related:${packageId}:*`;
    },
    packageDetailPattern() {
        return `${CACHE_PREFIX}:package:detail:*`;
    },
    packageFullPattern() {
        return `${CACHE_PREFIX}:package:full:*`;
    },
    packageTierServices(packageId, tierId) {
        return `${CACHE_PREFIX}:package-tier-map:${packageId}:tier:${tierId}`;
    },
    packageTierServicesByPackagePattern(packageId) {
        return `${CACHE_PREFIX}:package-tier-map:${packageId}:tier:*`;
    },
    packageTierServicesPattern() {
        return `${CACHE_PREFIX}:package-tier-map:*`;
    },
    packageResolvedPricing(packageId, tierId, locationId) {
        return `${CACHE_PREFIX}:package-pricing:resolved:${packageId}:${tierId}:${locationId}`;
    },
    packageResolvedPricingByPackagePattern(packageId) {
        return `${CACHE_PREFIX}:package-pricing:resolved:${packageId}:*`;
    },
    packageResolvedPricingPattern() {
        return `${CACHE_PREFIX}:package-pricing:resolved:*`;
    },
    componentList(params) {
        const payload = {
            searchTerm: params.searchTerm
                ?.trim()
                .toLowerCase() ?? "",
            categoryId: params.categoryId ?? null,
            limit: params.limit,
            page: params.page,
            isRemovable: typeof params.isRemovable === "boolean"
                ? params.isRemovable
                : null,
            isActive: typeof params.isActive === "boolean"
                ? params.isActive
                : null,
            isBundled: typeof params.isBundled === "boolean"
                ? params.isBundled
                : null,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:component:list:${hashPayload(payload)}`;
    },
    componentDetail(componentId) {
        return `${CACHE_PREFIX}:component:detail:${componentId}`;
    },
    componentListPattern() {
        return `${CACHE_PREFIX}:component:list:*`;
    },
    componentDetailPattern() {
        return `${CACHE_PREFIX}:component:detail:*`;
    },
    componentItemList(params) {
        const payload = {
            searchTerm: params.searchTerm
                ?.trim()
                .toLowerCase() ??
                "",
            limit: params.limit,
            page: params.page,
            isActive: typeof params.isActive ===
                "boolean"
                ? params.isActive
                : null,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:component-item:list:${hashPayload(payload)}`;
    },
    componentItemDetail(componentItemId) {
        return `${CACHE_PREFIX}:component-item:detail:${componentItemId}`;
    },
    componentItemListPattern() {
        return `${CACHE_PREFIX}:component-item:list:*`;
    },
    componentItemDetailPattern() {
        return `${CACHE_PREFIX}:component-item:detail:*`;
    },
    bookingList(params) {
        const payload = {
            searchTerm: params.searchTerm
                ?.trim()
                .toLowerCase() ?? "",
            status: params.status ?? null,
            paymentStatus: params.paymentStatus ?? null,
            userId: params.userId ?? null,
            accessibleByUserId: params.accessibleByUserId ?? null,
            bookingReference: params.bookingReference
                ?.trim() ?? null,
            fromDate: params.fromDate ?? null,
            toDate: params.toDate ?? null,
            limit: params.limit,
            page: params.page,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
            includeCoordinatorProfile: params.includeCoordinatorProfile,
        };
        return `${CACHE_PREFIX}:booking:list:${hashPayload(payload)}`;
    },
    bookingDetail(bookingId) {
        return `${CACHE_PREFIX}:booking:detail:${bookingId}`;
    },
    bookingStats() {
        return `${CACHE_PREFIX}:booking:stats`;
    },
    bookingInvoice(bookingId) {
        return `${CACHE_PREFIX}:booking:invoice:${bookingId}`;
    },
    bookingListPattern() {
        return `${CACHE_PREFIX}:booking:list:*`;
    },
    bookingDetailPattern() {
        return `${CACHE_PREFIX}:booking:detail:*`;
    },
    bookingInvoicePattern() {
        return `${CACHE_PREFIX}:booking:invoice:*`;
    },
    familyTree(ownerId) {
        return `${CACHE_PREFIX}:family-tree:${ownerId}:tree`;
    },
    familyMemberList(ownerId, params) {
        const payload = {
            search: params.search
                ?.trim()
                .toLowerCase() ?? "",
            relation: params.relation ?? null,
            gender: params.gender ?? null,
            lifeStatus: params.lifeStatus ?? null,
            page: params.page,
            limit: params.limit,
        };
        return `${CACHE_PREFIX}:family-tree:${ownerId}:members:${hashPayload(payload)}`;
    },
    familyMemberDetail(ownerId, familyMemberId) {
        return `${CACHE_PREFIX}:family-tree:${ownerId}:member:${familyMemberId}`;
    },
    familyMemberListPattern(ownerId) {
        return `${CACHE_PREFIX}:family-tree:${ownerId}:members:*`;
    },
    familyMemberDetailPattern(ownerId) {
        return `${CACHE_PREFIX}:family-tree:${ownerId}:member:*`;
    },
    categoryList(params) {
        const payload = {
            searchTerm: params.searchTerm
                ?.trim()
                .toLowerCase() ?? "",
            typeFilter: params.typeFilter ?? null,
            limit: params.limit,
            page: params.page,
            isActive: typeof params.isActive === "boolean"
                ? params.isActive
                : null,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:category:list:${hashPayload(payload)}`;
    },
    categoryDetail(categoryId) {
        return `${CACHE_PREFIX}:category:detail:${categoryId}`;
    },
    categoryListPattern() {
        return `${CACHE_PREFIX}:category:list:*`;
    },
    categoryDetailPattern() {
        return `${CACHE_PREFIX}:category:detail:*`;
    },
    tierList(params) {
        const payload = {
            searchTerm: params.searchTerm
                ?.trim()
                .toLowerCase() ?? "",
            limit: params.limit,
            page: params.page,
            isActive: typeof params.isActive === "boolean"
                ? params.isActive
                : null,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:tier:list:${hashPayload(payload)}`;
    },
    tierDetail(tierId) {
        return `${CACHE_PREFIX}:tier:detail:${tierId}`;
    },
    tierListPattern() {
        return `${CACHE_PREFIX}:tier:list:*`;
    },
    tierDetailPattern() {
        return `${CACHE_PREFIX}:tier:detail:*`;
    },
    subServiceComponentList(params) {
        const payload = {
            searchTerm: params.searchTerm
                ?.trim()
                .toLowerCase() ?? "",
            serviceId: normalizeCsvFilter(params.serviceId),
            limit: params.limit,
            page: params.page,
            isActive: typeof params.isActive === "boolean"
                ? params.isActive
                : null,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:sub-service-component:list:${hashPayload(payload)}`;
    },
    subServiceComponentDetail(subServiceComponentId) {
        return `${CACHE_PREFIX}:sub-service-component:detail:${subServiceComponentId}`;
    },
    subServiceComponentListPattern() {
        return `${CACHE_PREFIX}:sub-service-component:list:*`;
    },
    subServiceComponentDetailPattern() {
        return `${CACHE_PREFIX}:sub-service-component:detail:*`;
    },
    bannerList(params) {
        const payload = {
            searchTerm: params.searchTerm
                ?.trim()
                .toLowerCase() ?? "",
            placement: params.placement ?? null,
            format: params.format ?? null,
            redirectType: params.redirectType ?? null,
            limit: params.limit,
            page: params.page,
            isActive: typeof params.isActive === "boolean"
                ? params.isActive
                : null,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:banner:list:${hashPayload(payload)}`;
    },
    bannerDetail(bannerId) {
        return `${CACHE_PREFIX}:banner:detail:${bannerId}`;
    },
    bannerListPattern() {
        return `${CACHE_PREFIX}:banner:list:*`;
    },
    bannerDetailPattern() {
        return `${CACHE_PREFIX}:banner:detail:*`;
    },
    faqList(params) {
        const payload = {
            searchTerm: params.searchTerm
                ?.trim()
                .toLowerCase() ?? "",
            faqType: params.faqType ?? null,
            limit: params.limit,
            page: params.page,
            isActive: typeof params.isActive === "boolean"
                ? params.isActive
                : null,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:faq:list:${hashPayload(payload)}`;
    },
    faqDetail(faqId) {
        return `${CACHE_PREFIX}:faq:detail:${faqId}`;
    },
    faqListPattern() {
        return `${CACHE_PREFIX}:faq:list:*`;
    },
    faqDetailPattern() {
        return `${CACHE_PREFIX}:faq:detail:*`;
    },
    couponList(params) {
        const normalizedApplicableOn = Array.isArray(params.applicableOn)
            ? [
                ...new Set(params.applicableOn
                    .map((value) => value
                    .trim()
                    .toUpperCase())
                    .filter(Boolean)),
            ].sort()
            : params.applicableOn
                ?.split(",")
                .map((value) => value
                .trim()
                .toUpperCase())
                .filter(Boolean)
                .sort() ?? [];
        const payload = {
            searchTerm: params.searchTerm
                ?.trim()
                .toLowerCase() ?? "",
            assignedUserId: params.assignedUserId ?? null,
            applicableOn: normalizedApplicableOn,
            limit: params.limit,
            page: params.page,
            isActive: typeof params.isActive ===
                "boolean"
                ? params.isActive
                : null,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:coupon:list:${hashPayload(payload)}`;
    },
    couponDetail(couponId) {
        return `${CACHE_PREFIX}:coupon:detail:${couponId}`;
    },
    couponListPattern() {
        return `${CACHE_PREFIX}:coupon:list:*`;
    },
    couponDetailPattern() {
        return `${CACHE_PREFIX}:coupon:detail:*`;
    },
    referralInfo(userId) {
        return `${CACHE_PREFIX}:referral:info:${userId}`;
    },
    referralStats(userId) {
        return `${CACHE_PREFIX}:referral:stats:${userId}`;
    },
    referralHistory(userId, params) {
        const payload = {
            page: params.page,
            limit: params.limit,
        };
        return `${CACHE_PREFIX}:referral:history:${userId}:${hashPayload(payload)}`;
    },
    referralRewardList(params) {
        const payload = {
            userId: params.userId ?? null,
            status: params.status ?? null,
            page: params.page,
            limit: params.limit,
        };
        return `${CACHE_PREFIX}:referral:rewards:${hashPayload(payload)}`;
    },
    referralHistoryPattern(userId) {
        return `${CACHE_PREFIX}:referral:history:${userId}:*`;
    },
    referralRewardListPattern() {
        return `${CACHE_PREFIX}:referral:rewards:*`;
    },
    policyByType(type, userType) {
        return `${CACHE_PREFIX}:policy:active:${type}:${userType}`;
    },
    policyList(params) {
        const payload = {
            page: params.page,
            limit: params.limit,
            isActive: typeof params.isActive === "boolean"
                ? params.isActive
                : null,
            type: params.type ?? null,
            userType: params.userType ?? null,
        };
        return `${CACHE_PREFIX}:policy:list:${hashPayload(payload)}`;
    },
    policyListPattern() {
        return `${CACHE_PREFIX}:policy:list:*`;
    },
    policyActivePattern() {
        return `${CACHE_PREFIX}:policy:active:*`;
    },
    reviewList(params) {
        const payload = {
            searchTerm: params.searchTerm
                ?.trim()
                .toLowerCase() ?? "",
            direction: params.direction ?? null,
            visibility: params.visibility ?? null,
            moderationStatus: params.moderationStatus ?? null,
            isDeleted: typeof params.isDeleted === "boolean"
                ? params.isDeleted
                : null,
            rating: typeof params.rating === "number"
                ? params.rating
                : null,
            reviewerId: params.reviewerId ?? null,
            revieweeId: params.revieweeId ?? null,
            bookingId: params.bookingId ?? null,
            limit: params.limit,
            page: params.page,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:review:list:${hashPayload(payload)}`;
    },
    myBookingReview(bookingId, userId) {
        return `${CACHE_PREFIX}:review:booking:${bookingId}:user:${userId}`;
    },
    myReviewList(params) {
        return `${CACHE_PREFIX}:review:mine:${hashPayload(params)}`;
    },
    coordinatorReviewList(params) {
        return `${CACHE_PREFIX}:review:coordinator:${hashPayload(params)}`;
    },
    reviewListPattern() {
        return `${CACHE_PREFIX}:review:list:*`;
    },
    myBookingReviewPattern() {
        return `${CACHE_PREFIX}:review:booking:*`;
    },
    myReviewListPattern() {
        return `${CACHE_PREFIX}:review:mine:*`;
    },
    coordinatorReviewListPattern() {
        return `${CACHE_PREFIX}:review:coordinator:*`;
    },
    userQueryMyList(params) {
        const payload = {
            requesterId: params.requesterId,
            status: params.status ?? null,
            category: params.category ?? null,
            limit: params.limit,
            page: params.page,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:user-query:my-list:${hashPayload(payload)}`;
    },
    userQueryUserDetail(queryId, requesterId) {
        return `${CACHE_PREFIX}:user-query:user-detail:${queryId}:${requesterId}`;
    },
    userQueryAdminList(params) {
        const payload = {
            searchTerm: params.searchTerm
                ?.trim()
                .toLowerCase() ?? "",
            status: params.status ?? null,
            category: params.category ?? null,
            priority: params.priority ?? null,
            requesterType: params.requesterType ?? null,
            assignedAdminId: params.assignedAdminId ?? null,
            requesterId: params.requesterId ?? null,
            isDeleted: params.isDeleted,
            limit: params.limit,
            page: params.page,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
        };
        return `${CACHE_PREFIX}:user-query:admin-list:${hashPayload(payload)}`;
    },
    userQueryAdminDetail(queryId) {
        return `${CACHE_PREFIX}:user-query:admin-detail:${queryId}`;
    },
    userQueryMyListPattern() {
        return `${CACHE_PREFIX}:user-query:my-list:*`;
    },
    userQueryUserDetailPattern() {
        return `${CACHE_PREFIX}:user-query:user-detail:*`;
    },
    userQueryAdminListPattern() {
        return `${CACHE_PREFIX}:user-query:admin-list:*`;
    },
    userQueryAdminDetailPattern() {
        return `${CACHE_PREFIX}:user-query:admin-detail:*`;
    },
    taxProfileList(params) {
        const payload = {
            search: params.search
                ?.trim()
                .toLowerCase() ?? "",
            treatment: params.treatment ?? null,
            isActive: typeof params.isActive === "boolean"
                ? params.isActive
                : null,
            page: params.page,
            limit: params.limit,
        };
        return `${CACHE_PREFIX}:tax-profile:list:${hashPayload(payload)}`;
    },
    activeTaxProfileList() {
        return `${CACHE_PREFIX}:tax-profile:active-list`;
    },
    taxProfileDetail(taxProfileId) {
        return `${CACHE_PREFIX}:tax-profile:detail:${taxProfileId}`;
    },
    taxProfileListPattern() {
        return `${CACHE_PREFIX}:tax-profile:list:*`;
    },
    taxProfileDetailPattern() {
        return `${CACHE_PREFIX}:tax-profile:detail:*`;
    },
    chatParticipantIds(userId) {
        return `${CACHE_PREFIX}:chat:participant-ids:${userId}`;
    },
    chatParticipantIdsPattern() {
        return `${CACHE_PREFIX}:chat:participant-ids:*`;
    },
    rbacPermissionList(params) {
        const payload = {
            module: params.module
                ?.trim()
                .toLowerCase() ?? "",
            isActive: typeof params.isActive === "boolean"
                ? params.isActive
                : null,
            page: params.page,
            limit: params.limit,
        };
        return `${CACHE_PREFIX}:rbac:permission:list:${hashPayload(payload)}`;
    },
    rbacPermissionDetail(permissionId) {
        return `${CACHE_PREFIX}:rbac:permission:detail:${permissionId}`;
    },
    rbacRoleList(params) {
        const payload = {
            isActive: typeof params.isActive === "boolean"
                ? params.isActive
                : null,
            page: params.page,
            limit: params.limit,
        };
        return `${CACHE_PREFIX}:rbac:role:list:${hashPayload(payload)}`;
    },
    rbacRoleDetail(roleId) {
        return `${CACHE_PREFIX}:rbac:role:detail:${roleId}`;
    },
    rbacUserAccess(userId) {
        return `${CACHE_PREFIX}:rbac:user-access:${userId}`;
    },
    rbacPermissionListPattern() {
        return `${CACHE_PREFIX}:rbac:permission:list:*`;
    },
    rbacPermissionDetailPattern() {
        return `${CACHE_PREFIX}:rbac:permission:detail:*`;
    },
    rbacRoleListPattern() {
        return `${CACHE_PREFIX}:rbac:role:list:*`;
    },
    rbacRoleDetailPattern() {
        return `${CACHE_PREFIX}:rbac:role:detail:*`;
    },
    rbacUserAccessPattern() {
        return `${CACHE_PREFIX}:rbac:user-access:*`;
    },
    packageFullByCitiesPatternAll() {
        return `${CACHE_PREFIX}:package:full-by-cities:*`;
    }
};
//# sourceMappingURL=cache-keys.js.map