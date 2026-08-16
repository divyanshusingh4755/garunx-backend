import {
    createHash,
} from "node:crypto";

import {
    CACHE_PREFIX,
} from "./constants.js";

const hashPayload = (
    payload:
        unknown,
): string => {
    return createHash(
        "sha256",
    )
        .update(
            JSON.stringify(
                payload,
            ),
        )
        .digest(
            "hex",
        )
        .slice(
            0,
            24,
        );
};

const normalizeStringArray = (
    values?:
        string[] | undefined,
): string[] => {
    if (
        !values?.length
    ) {
        return [];
    }

    return [
        ...new Set(
            values
                .map(
                    (
                        value,
                    ) =>
                        value.trim(),
                )
                .filter(
                    Boolean,
                ),
        ),
    ].sort();
};

const normalizeCsvFilter = (
    value?:
        string,
): string[] => {
    if (
        !value?.trim()
    ) {
        return [];
    }

    return value
        .split(",")
        .map(
            (
                item,
            ) =>
                item.trim(),
        )
        .filter(Boolean)
        .sort();
};

export const CacheKeys = {
    /*
     * =========================
     * STATE
     * =========================
     */

    stateList(
        params: {
            searchTerm?: string | undefined;
            countryFilter?: string | undefined;
            stateFilter?: string | undefined;
            limit: number;
            page: number;
            isActive?: boolean | undefined;
            sortBy: string;
            sortOrder:
            "asc" | "desc";
        },
    ): string {
        const payload = {
            searchTerm:
                params.searchTerm
                    ?.trim() ??
                "",

            countryFilter:
                normalizeCsvFilter(
                    params.countryFilter,
                ),

            stateFilter:
                normalizeCsvFilter(
                    params.stateFilter,
                ),

            limit:
                params.limit,

            page:
                params.page,

            isActive:
                typeof params.isActive ===
                    "boolean"
                    ? params.isActive
                    : null,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:state:list:${hashPayload(payload)}`;
    },

    stateDetail(
        stateId:
            string,
    ): string {
        return `${CACHE_PREFIX}:state:detail:${stateId}`;
    },

    stateListPattern():
        string {
        return `${CACHE_PREFIX}:state:list:*`;
    },

    /*
     * =========================
     * USER
     * =========================
     */

    userList(
        params: {
            page: number;
            limit: number;
            role?: string | undefined;
            isComplete?: boolean | undefined;
            isActive?: boolean | undefined;
            search?: string | undefined;
            sortBy: string;
            sortOrder:
            "asc" | "desc";
        },
    ): string {
        const payload = {
            page:
                params.page,

            limit:
                params.limit,

            role:
                params.role ??
                null,

            isComplete:
                typeof params.isComplete ===
                    "boolean"
                    ? params.isComplete
                    : null,

            isActive:
                typeof params.isActive ===
                    "boolean"
                    ? params.isActive
                    : null,

            search:
                params.search
                    ?.trim()
                    .toLowerCase() ??
                "",

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:user:list:${hashPayload(payload)}`;
    },

    userDetail(
        userId:
            string,
    ): string {
        return `${CACHE_PREFIX}:user:detail:${userId}`;
    },

    currentUser(
        userId:
            string,
    ): string {
        return `${CACHE_PREFIX}:user:current:${userId}`;
    },

    userListPattern():
        string {
        return `${CACHE_PREFIX}:user:list:*`;
    },

    /*
     * =========================
     * COORDINATOR
     * =========================
     */

    coordinatorList(
        params: {
            page: number;
            limit: number;

            approvalStatus?:
            string | undefined;

            availabilityStatus?:
            string | undefined;

            locationId?:
            string | undefined;

            caste?:
            string | undefined;

            gotra?:
            string | undefined;

            autoAssignmentEnabled?:
            boolean | undefined;

            minimumRating?:
            number | undefined;

            search?:
            string | undefined;

            sortBy:
            string;

            sortOrder:
            "asc" | "desc";
        },
    ): string {
        const payload = {
            page:
                params.page,

            limit:
                params.limit,

            approvalStatus:
                params.approvalStatus ??
                null,

            availabilityStatus:
                params.availabilityStatus ??
                null,

            locationId:
                params.locationId ??
                null,

            caste:
                params.caste ??
                null,

            gotra:
                params.gotra ??
                null,

            autoAssignmentEnabled:
                typeof params.autoAssignmentEnabled ===
                    "boolean"
                    ? params.autoAssignmentEnabled
                    : null,

            minimumRating:
                params.minimumRating ??
                null,

            search:
                params.search
                    ?.trim()
                    .toLowerCase() ??
                "",

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:coordinator:list:${hashPayload(payload)}`;
    },

    coordinatorDetail(
        coordinatorId:
            string,
    ): string {
        return `${CACHE_PREFIX}:coordinator:detail:${coordinatorId}`;
    },

    coordinatorListPattern():
        string {
        return `${CACHE_PREFIX}:coordinator:list:*`;
    },

    brandingTheme(): string {
        return `${CACHE_PREFIX}:branding:theme`;
    },

    locationList(
        params: {
            searchTerm?: string | undefined;
            countryFilter?: string | undefined;
            stateIdFilter?: string | undefined;
            cityIdFilter?: string | undefined;
            pincodeFilter?: string | undefined;
            limit: number;
            page: number;
            isActive?: boolean | undefined;
            sortBy: string;
            sortOrder:
            "asc" | "desc";
        },
    ): string {
        const payload = {
            searchTerm:
                params.searchTerm
                    ?.trim()
                    .toLowerCase() ??
                "",

            countryFilter:
                normalizeCsvFilter(
                    params.countryFilter,
                ),

            stateIdFilter:
                normalizeCsvFilter(
                    params.stateIdFilter,
                ),

            cityIdFilter:
                normalizeCsvFilter(
                    params.cityIdFilter,
                ),

            pincodeFilter:
                normalizeCsvFilter(
                    params.pincodeFilter,
                ),

            limit:
                params.limit,

            page:
                params.page,

            isActive:
                typeof params.isActive ===
                    "boolean"
                    ? params.isActive
                    : null,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:location:list:${hashPayload(payload)}`;
    },

    locationDetail(
        locationId: string,
    ): string {
        return `${CACHE_PREFIX}:location:detail:${locationId}`;
    },

    locationDetailPattern():
        string {
        return `${CACHE_PREFIX}:location:detail:*`;
    },

    locationListPattern():
        string {
        return `${CACHE_PREFIX}:location:list:*`;
    },

    locationIdsPattern():
        string {
        return `${CACHE_PREFIX}:location:ids:*`;
    },

    locationIds(
        locationIds:
            string[],
    ): string {
        const normalizedIds = [
            ...new Set(
                locationIds.map(
                    (
                        id,
                    ) =>
                        id.trim(),
                ),
            ),
        ].sort();

        return `${CACHE_PREFIX}:location:ids:${hashPayload(normalizedIds)}`;
    },

    cityList(
        params: {
            searchTerm?: string | undefined;
            cityFilter?: string | undefined;
            stateIdFilter?: string | undefined;
            countryFilter?: string | undefined;
            limit: number;
            page: number;
            isActive?: boolean | undefined;
            sortBy: string;
            sortOrder:
            "asc" | "desc";
        },
    ): string {
        const payload = {
            searchTerm:
                params.searchTerm
                    ?.trim()
                    .toLowerCase() ??
                "",

            cityFilter:
                normalizeCsvFilter(
                    params.cityFilter,
                ),

            stateIdFilter:
                normalizeCsvFilter(
                    params.stateIdFilter,
                ),

            countryFilter:
                normalizeCsvFilter(
                    params.countryFilter,
                ),

            limit:
                params.limit,

            page:
                params.page,

            isActive:
                typeof params.isActive ===
                    "boolean"
                    ? params.isActive
                    : null,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:city:list:${hashPayload(payload)}`;
    },

    cityDetail(
        cityId:
            string,
    ): string {
        return `${CACHE_PREFIX}:city:detail:${cityId}`;
    },

    cityListPattern():
        string {
        return `${CACHE_PREFIX}:city:list:*`;
    },

    cityDetailPattern():
        string {
        return `${CACHE_PREFIX}:city:detail:*`;
    },

    serviceList(
        params: {
            searchTerm?: string | undefined;
            categoryId?: string | undefined;
            locationId?: string | undefined;
            limit: number;
            page: number;
            isActive?: boolean | undefined;
            isComplete?: boolean | undefined;
            sortBy: string;
            sortOrder:
            "asc" | "desc";
        },
    ): string {
        const payload = {
            searchTerm:
                params.searchTerm
                    ?.trim()
                    .toLowerCase() ??
                "",

            categoryId:
                params.categoryId ??
                null,

            locationId:
                params.locationId ??
                null,

            limit:
                params.limit,

            page:
                params.page,

            isActive:
                typeof params.isActive ===
                    "boolean"
                    ? params.isActive
                    : null,

            isComplete:
                typeof params.isComplete ===
                    "boolean"
                    ? params.isComplete
                    : null,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:service:list:${hashPayload(payload)}`;
    },

    serviceByLocationList(
        params: {
            cityIds?: string[] | undefined;
            categoryIds?: string[] | undefined;
            limit: number;
            page: number;
            isActive?: boolean | undefined;
            isComplete?: boolean | undefined;
            sortBy: string;
            sortOrder:
            "asc" | "desc";
        },
    ): string {
        const payload = {
            cityIds:
                normalizeStringArray(
                    params.cityIds,
                ),

            categoryIds:
                normalizeStringArray(
                    params.categoryIds,
                ),

            limit:
                params.limit,

            page:
                params.page,

            isActive:
                typeof params.isActive ===
                    "boolean"
                    ? params.isActive
                    : null,

            isComplete:
                typeof params.isComplete ===
                    "boolean"
                    ? params.isComplete
                    : null,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:service:by-location:${hashPayload(payload)}`;
    },

    serviceDetail(
        serviceId:
            string,
    ): string {
        return `${CACHE_PREFIX}:service:detail:${serviceId}`;
    },

    serviceFull(
        serviceId:
            string,
    ): string {
        return `${CACHE_PREFIX}:service:full:${serviceId}`;
    },

    serviceFullByCities(
        serviceId:
            string,
        cityIds:
            string[],
    ): string {
        const normalizedCityIds =
            normalizeStringArray(
                cityIds,
            );

        return `${CACHE_PREFIX}:service:full-by-cities:${serviceId}:${hashPayload(normalizedCityIds)}`;
    },

    serviceListPattern():
        string {
        return `${CACHE_PREFIX}:service:list:*`;
    },

    serviceByLocationListPattern():
        string {
        return `${CACHE_PREFIX}:service:by-location:*`;
    },

    serviceFullByCitiesPattern(
        serviceId:
            string,
    ): string {
        return `${CACHE_PREFIX}:service:full-by-cities:${serviceId}:*`;
    },

    serviceDetailPattern():
        string {
        return `${CACHE_PREFIX}:service:detail:*`;
    },

    serviceFullPattern():
        string {
        return `${CACHE_PREFIX}:service:full:*`;
    },

    serviceComponentsByTier(
        serviceId:
            string,
        tierId:
            string,
    ): string {
        return `${CACHE_PREFIX}:service-component:${serviceId}:tier:${tierId}`;
    },

    serviceComponentsByServicePattern(
        serviceId:
            string,
    ): string {
        return `${CACHE_PREFIX}:service-component:${serviceId}:tier:*`;
    },

    serviceComponentPattern():
        string {
        return `${CACHE_PREFIX}:service-component:*`;
    },

    serviceResolvedPricing(
        serviceId:
            string,
        tierId:
            string,
        locationId:
            string,
    ): string {
        return `${CACHE_PREFIX}:service-pricing:resolved:${serviceId}:${tierId}:${locationId}`;
    },

    serviceResolvedPricingByServicePattern(
        serviceId:
            string,
    ): string {
        return `${CACHE_PREFIX}:service-pricing:resolved:${serviceId}:*`;
    },

    serviceResolvedPricingPattern():
        string {
        return `${CACHE_PREFIX}:service-pricing:resolved:*`;
    },

    packageList(
        params: {
            searchTerm?: string | undefined;
            categoryId?: string | undefined;
            locationId?: string | undefined;
            tierId?: string | undefined;
            limit: number;
            page: number;
            isActive?: boolean | undefined;
            isComplete?: boolean | undefined;
            sortBy: string;
            sortOrder:
            "asc" | "desc";
        },
    ): string {
        const payload = {
            searchTerm:
                params.searchTerm
                    ?.trim()
                    .toLowerCase() ??
                "",

            categoryId:
                params.categoryId ??
                null,

            locationId:
                params.locationId ??
                null,

            tierId:
                params.tierId ??
                null,

            limit:
                params.limit,

            page:
                params.page,

            isActive:
                typeof params.isActive ===
                    "boolean"
                    ? params.isActive
                    : null,

            isComplete:
                typeof params.isComplete ===
                    "boolean"
                    ? params.isComplete
                    : null,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:package:list:${hashPayload(payload)}`;
    },

    packageByLocationList(
        params: {
            cityIds?: string[] | undefined;
            categoryIds?: string[] | undefined;
            limit: number;
            page: number;
            isActive?: boolean | undefined;
            isComplete?: boolean | undefined;
            sortBy: string;
            sortOrder:
            "asc" | "desc";
        },
    ): string {
        const payload = {
            cityIds:
                normalizeStringArray(
                    params.cityIds,
                ),

            categoryIds:
                normalizeStringArray(
                    params.categoryIds,
                ),

            limit:
                params.limit,

            page:
                params.page,

            isActive:
                typeof params.isActive ===
                    "boolean"
                    ? params.isActive
                    : null,

            isComplete:
                typeof params.isComplete ===
                    "boolean"
                    ? params.isComplete
                    : null,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:package:by-location:${hashPayload(payload)}`;
    },

    packageDetail(
        packageId:
            string,
    ): string {
        return `${CACHE_PREFIX}:package:detail:${packageId}`;
    },

    packageFull(
        packageId:
            string,
    ): string {
        return `${CACHE_PREFIX}:package:full:${packageId}`;
    },

    packageFullByCities(
        packageId:
            string,
        cityIds:
            string[],
    ): string {
        return `${CACHE_PREFIX}:package:full-by-cities:${packageId}:${hashPayload(
            normalizeStringArray(
                cityIds,
            ),
        )}`;
    },

    packageRelatedServices(
        packageId:
            string,
        tierId:
            string,
        locationId:
            string,
    ): string {
        return `${CACHE_PREFIX}:package:related:${packageId}:${tierId}:${locationId}`;
    },

    packageListPattern():
        string {
        return `${CACHE_PREFIX}:package:list:*`;
    },

    packageByLocationListPattern():
        string {
        return `${CACHE_PREFIX}:package:by-location:*`;
    },

    packageFullByCitiesPattern(
        packageId:
            string,
    ): string {
        return `${CACHE_PREFIX}:package:full-by-cities:${packageId}:*`;
    },

    packageRelatedServicesPattern(
        packageId:
            string,
    ): string {
        return `${CACHE_PREFIX}:package:related:${packageId}:*`;
    },

    packageDetailPattern():
        string {
        return `${CACHE_PREFIX}:package:detail:*`;
    },

    packageFullPattern():
        string {
        return `${CACHE_PREFIX}:package:full:*`;
    },

    packageTierServices(
        packageId:
            string,
        tierId:
            string,
    ): string {
        return `${CACHE_PREFIX}:package-tier-map:${packageId}:tier:${tierId}`;
    },

    packageTierServicesByPackagePattern(
        packageId:
            string,
    ): string {
        return `${CACHE_PREFIX}:package-tier-map:${packageId}:tier:*`;
    },

    packageTierServicesPattern():
        string {
        return `${CACHE_PREFIX}:package-tier-map:*`;
    },

    packageResolvedPricing(
        packageId:
            string,
        tierId:
            string,
        locationId:
            string,
    ): string {
        return `${CACHE_PREFIX}:package-pricing:resolved:${packageId}:${tierId}:${locationId}`;
    },

    packageResolvedPricingByPackagePattern(
        packageId:
            string,
    ): string {
        return `${CACHE_PREFIX}:package-pricing:resolved:${packageId}:*`;
    },

    packageResolvedPricingPattern():
        string {
        return `${CACHE_PREFIX}:package-pricing:resolved:*`;
    },

    componentList(
        params: {
            searchTerm?: string | undefined;
            categoryId?: string | undefined;
            limit: number;
            page: number;
            isRemovable?: boolean | undefined;
            isActive?: boolean | undefined;
            isBundled?: boolean | undefined;
            sortBy: string;
            sortOrder: "asc" | "desc";
        },
    ): string {
        const payload = {
            searchTerm:
                params.searchTerm
                    ?.trim()
                    .toLowerCase() ?? "",

            categoryId:
                params.categoryId ?? null,

            limit:
                params.limit,

            page:
                params.page,

            isRemovable:
                typeof params.isRemovable === "boolean"
                    ? params.isRemovable
                    : null,

            isActive:
                typeof params.isActive === "boolean"
                    ? params.isActive
                    : null,

            isBundled:
                typeof params.isBundled === "boolean"
                    ? params.isBundled
                    : null,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:component:list:${hashPayload(payload)}`;
    },

    componentDetail(
        componentId: string,
    ): string {
        return `${CACHE_PREFIX}:component:detail:${componentId}`;
    },

    componentListPattern(): string {
        return `${CACHE_PREFIX}:component:list:*`;
    },

    componentDetailPattern(): string {
        return `${CACHE_PREFIX}:component:detail:*`;
    },

    componentItemList(
        params: {
            searchTerm?: string | undefined;
            limit: number;
            page: number;
            isActive?: boolean | undefined;
            sortBy: string;
            sortOrder:
            "asc" | "desc";
        },
    ): string {
        const payload = {
            searchTerm:
                params.searchTerm
                    ?.trim()
                    .toLowerCase() ??
                "",

            limit:
                params.limit,

            page:
                params.page,

            isActive:
                typeof params.isActive ===
                    "boolean"
                    ? params.isActive
                    : null,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:component-item:list:${hashPayload(payload)}`;
    },

    componentItemDetail(
        componentItemId:
            string,
    ): string {
        return `${CACHE_PREFIX}:component-item:detail:${componentItemId}`;
    },

    componentItemListPattern():
        string {
        return `${CACHE_PREFIX}:component-item:list:*`;
    },

    componentItemDetailPattern():
        string {
        return `${CACHE_PREFIX}:component-item:detail:*`;
    },

    bookingList(
        params: {
            searchTerm?: string | undefined;
            status?: string | undefined;
            paymentStatus?: string | undefined;
            userId?: string | undefined;
            accessibleByUserId?: string | undefined;
            bookingReference?: string | undefined;
            fromDate?: string | undefined;
            toDate?: string | undefined;
            limit: number;
            page: number;
            sortBy: string;
            sortOrder: "asc" | "desc";
            includeCoordinatorProfile: boolean;
        },
    ): string {
        const payload = {
            searchTerm:
                params.searchTerm
                    ?.trim()
                    .toLowerCase() ?? "",

            status:
                params.status ?? null,

            paymentStatus:
                params.paymentStatus ?? null,

            userId:
                params.userId ?? null,

            accessibleByUserId:
                params.accessibleByUserId ?? null,

            bookingReference:
                params.bookingReference
                    ?.trim() ?? null,

            fromDate:
                params.fromDate ?? null,

            toDate:
                params.toDate ?? null,

            limit:
                params.limit,

            page:
                params.page,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,

            includeCoordinatorProfile:
                params.includeCoordinatorProfile,
        };

        return `${CACHE_PREFIX}:booking:list:${hashPayload(payload)}`;
    },

    bookingDetail(
        bookingId: string,
    ): string {
        return `${CACHE_PREFIX}:booking:detail:${bookingId}`;
    },

    bookingStats(): string {
        return `${CACHE_PREFIX}:booking:stats`;
    },

    bookingInvoice(
        bookingId: string,
    ): string {
        return `${CACHE_PREFIX}:booking:invoice:${bookingId}`;
    },

    bookingListPattern(): string {
        return `${CACHE_PREFIX}:booking:list:*`;
    },

    bookingDetailPattern(): string {
        return `${CACHE_PREFIX}:booking:detail:*`;
    },

    bookingInvoicePattern(): string {
        return `${CACHE_PREFIX}:booking:invoice:*`;
    },

    familyTree(
        ownerId: string,
    ): string {
        return `${CACHE_PREFIX}:family-tree:${ownerId}:tree`;
    },

    familyMemberList(
        ownerId: string,
        params: {
            search?: string | undefined;
            relation?: string | undefined;
            gender?: string | undefined;
            lifeStatus?: string | undefined;
            page: number;
            limit: number;
        },
    ): string {
        const payload = {
            search:
                params.search
                    ?.trim()
                    .toLowerCase() ?? "",

            relation:
                params.relation ?? null,

            gender:
                params.gender ?? null,

            lifeStatus:
                params.lifeStatus ?? null,

            page:
                params.page,

            limit:
                params.limit,
        };

        return `${CACHE_PREFIX}:family-tree:${ownerId}:members:${hashPayload(payload)}`;
    },

    familyMemberDetail(
        ownerId: string,
        familyMemberId: string,
    ): string {
        return `${CACHE_PREFIX}:family-tree:${ownerId}:member:${familyMemberId}`;
    },

    familyMemberListPattern(
        ownerId: string,
    ): string {
        return `${CACHE_PREFIX}:family-tree:${ownerId}:members:*`;
    },

    familyMemberDetailPattern(
        ownerId: string,
    ): string {
        return `${CACHE_PREFIX}:family-tree:${ownerId}:member:*`;
    },

    categoryList(
        params: {
            searchTerm?: string | undefined;
            typeFilter?: "service" | "product" | undefined;
            limit: number;
            page: number;
            isActive?: boolean | undefined;
            sortBy: string;
            sortOrder: "asc" | "desc";
        },
    ): string {
        const payload = {
            searchTerm:
                params.searchTerm
                    ?.trim()
                    .toLowerCase() ?? "",

            typeFilter:
                params.typeFilter ?? null,

            limit:
                params.limit,

            page:
                params.page,

            isActive:
                typeof params.isActive === "boolean"
                    ? params.isActive
                    : null,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:category:list:${hashPayload(payload)}`;
    },

    categoryDetail(
        categoryId: string,
    ): string {
        return `${CACHE_PREFIX}:category:detail:${categoryId}`;
    },

    categoryListPattern(): string {
        return `${CACHE_PREFIX}:category:list:*`;
    },

    categoryDetailPattern(): string {
        return `${CACHE_PREFIX}:category:detail:*`;
    },

    tierList(
        params: {
            searchTerm?: string | undefined;
            limit: number;
            page: number;
            isActive?: boolean | undefined;
            sortBy: string;
            sortOrder: "asc" | "desc";
        },
    ): string {
        const payload = {
            searchTerm:
                params.searchTerm
                    ?.trim()
                    .toLowerCase() ?? "",

            limit:
                params.limit,

            page:
                params.page,

            isActive:
                typeof params.isActive === "boolean"
                    ? params.isActive
                    : null,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:tier:list:${hashPayload(payload)}`;
    },

    tierDetail(
        tierId: string,
    ): string {
        return `${CACHE_PREFIX}:tier:detail:${tierId}`;
    },

    tierListPattern(): string {
        return `${CACHE_PREFIX}:tier:list:*`;
    },

    tierDetailPattern(): string {
        return `${CACHE_PREFIX}:tier:detail:*`;
    },

    subServiceComponentList(
        params: {
            searchTerm?: string | undefined;
            serviceId?: string | undefined;
            limit: number;
            page: number;
            isActive?: boolean | undefined;
            sortBy: string;
            sortOrder: "asc" | "desc";
        },
    ): string {
        const payload = {
            searchTerm:
                params.searchTerm
                    ?.trim()
                    .toLowerCase() ?? "",

            serviceId:
                normalizeCsvFilter(
                    params.serviceId,
                ),

            limit:
                params.limit,

            page:
                params.page,

            isActive:
                typeof params.isActive === "boolean"
                    ? params.isActive
                    : null,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:sub-service-component:list:${hashPayload(payload)}`;
    },

    subServiceComponentDetail(
        subServiceComponentId: string,
    ): string {
        return `${CACHE_PREFIX}:sub-service-component:detail:${subServiceComponentId}`;
    },

    subServiceComponentListPattern(): string {
        return `${CACHE_PREFIX}:sub-service-component:list:*`;
    },

    subServiceComponentDetailPattern(): string {
        return `${CACHE_PREFIX}:sub-service-component:detail:*`;
    },

    bannerList(
        params: {
            searchTerm?: string | undefined;
            placement?: string | undefined;
            format?: string | undefined;
            redirectType?: string | undefined;
            limit: number;
            page: number;
            isActive?: boolean | undefined;
            sortBy: string;
            sortOrder: "asc" | "desc";
        },
    ): string {
        const payload = {
            searchTerm:
                params.searchTerm
                    ?.trim()
                    .toLowerCase() ?? "",

            placement:
                params.placement ?? null,

            format:
                params.format ?? null,

            redirectType:
                params.redirectType ?? null,

            limit:
                params.limit,

            page:
                params.page,

            isActive:
                typeof params.isActive === "boolean"
                    ? params.isActive
                    : null,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:banner:list:${hashPayload(payload)}`;
    },

    bannerDetail(
        bannerId: string,
    ): string {
        return `${CACHE_PREFIX}:banner:detail:${bannerId}`;
    },

    bannerListPattern(): string {
        return `${CACHE_PREFIX}:banner:list:*`;
    },

    bannerDetailPattern(): string {
        return `${CACHE_PREFIX}:banner:detail:*`;
    },

    faqList(
        params: {
            searchTerm?: string | undefined;
            faqType?: string | undefined;
            limit: number;
            page: number;
            isActive?: boolean | undefined;
            sortBy: string;
            sortOrder: "asc" | "desc";
        },
    ): string {
        const payload = {
            searchTerm:
                params.searchTerm
                    ?.trim()
                    .toLowerCase() ?? "",

            faqType:
                params.faqType ?? null,

            limit:
                params.limit,

            page:
                params.page,

            isActive:
                typeof params.isActive === "boolean"
                    ? params.isActive
                    : null,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:faq:list:${hashPayload(payload)}`;
    },

    faqDetail(
        faqId: string,
    ): string {
        return `${CACHE_PREFIX}:faq:detail:${faqId}`;
    },

    faqListPattern(): string {
        return `${CACHE_PREFIX}:faq:list:*`;
    },

    faqDetailPattern(): string {
        return `${CACHE_PREFIX}:faq:detail:*`;
    },

    couponList(
        params: {
            searchTerm?: string | undefined;
            assignedUserId?: string | undefined;
            applicableOn?: string | string[] | undefined;
            limit: number;
            page: number;
            isActive?: boolean | undefined;
            sortBy: string;
            sortOrder: "asc" | "desc";
        },
    ): string {
        const normalizedApplicableOn =
            Array.isArray(
                params.applicableOn,
            )
                ? [
                    ...new Set(
                        params.applicableOn
                            .map(
                                (value) =>
                                    value
                                        .trim()
                                        .toUpperCase(),
                            )
                            .filter(Boolean),
                    ),
                ].sort()
                : params.applicableOn
                    ?.split(",")
                    .map(
                        (value) =>
                            value
                                .trim()
                                .toUpperCase(),
                    )
                    .filter(Boolean)
                    .sort() ?? [];

        const payload = {
            searchTerm:
                params.searchTerm
                    ?.trim()
                    .toLowerCase() ?? "",

            assignedUserId:
                params.assignedUserId ?? null,

            applicableOn:
                normalizedApplicableOn,

            limit:
                params.limit,

            page:
                params.page,

            isActive:
                typeof params.isActive ===
                    "boolean"
                    ? params.isActive
                    : null,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:coupon:list:${hashPayload(payload)}`;
    },

    couponDetail(
        couponId: string,
    ): string {
        return `${CACHE_PREFIX}:coupon:detail:${couponId}`;
    },

    couponListPattern(): string {
        return `${CACHE_PREFIX}:coupon:list:*`;
    },

    couponDetailPattern(): string {
        return `${CACHE_PREFIX}:coupon:detail:*`;
    },

    referralInfo(
        userId: string,
    ): string {
        return `${CACHE_PREFIX}:referral:info:${userId}`;
    },

    referralStats(
        userId: string,
    ): string {
        return `${CACHE_PREFIX}:referral:stats:${userId}`;
    },

    referralHistory(
        userId: string,
        params: {
            page: number;
            limit: number;
        },
    ): string {
        const payload = {
            page:
                params.page,

            limit:
                params.limit,
        };

        return `${CACHE_PREFIX}:referral:history:${userId}:${hashPayload(payload)}`;
    },

    referralRewardList(
        params: {
            userId?: string | undefined;
            status?: string | undefined;
            page: number;
            limit: number;
        },
    ): string {
        const payload = {
            userId:
                params.userId ?? null,

            status:
                params.status ?? null,

            page:
                params.page,

            limit:
                params.limit,
        };

        return `${CACHE_PREFIX}:referral:rewards:${hashPayload(payload)}`;
    },

    referralHistoryPattern(
        userId: string,
    ): string {
        return `${CACHE_PREFIX}:referral:history:${userId}:*`;
    },

    referralRewardListPattern(): string {
        return `${CACHE_PREFIX}:referral:rewards:*`;
    },

    policyByType(
        type: string,
        userType: string,
    ): string {
        return `${CACHE_PREFIX}:policy:active:${type}:${userType}`;
    },

    policyList(
        params: {
            page: number;
            limit: number;
            isActive?: boolean | undefined;
            type?: string | undefined;
            userType?: string | undefined;
        },
    ): string {
        const payload = {
            page:
                params.page,

            limit:
                params.limit,

            isActive:
                typeof params.isActive === "boolean"
                    ? params.isActive
                    : null,

            type:
                params.type ?? null,

            userType:
                params.userType ?? null,
        };

        return `${CACHE_PREFIX}:policy:list:${hashPayload(payload)}`;
    },

    policyListPattern(): string {
        return `${CACHE_PREFIX}:policy:list:*`;
    },

    policyActivePattern(): string {
        return `${CACHE_PREFIX}:policy:active:*`;
    },

    reviewList(
        params: {
            searchTerm?: string | undefined;
            direction?: string | undefined;
            visibility?: string | undefined;
            moderationStatus?: string | undefined;
            isDeleted?: boolean | undefined;
            rating?: number | undefined;
            reviewerId?: string | undefined;
            revieweeId?: string | undefined;
            bookingId?: string | undefined;
            limit: number;
            page: number;
            sortBy: string;
            sortOrder: "asc" | "desc";
        },
    ): string {
        const payload = {
            searchTerm:
                params.searchTerm
                    ?.trim()
                    .toLowerCase() ?? "",

            direction:
                params.direction ?? null,

            visibility:
                params.visibility ?? null,

            moderationStatus:
                params.moderationStatus ?? null,

            isDeleted:
                typeof params.isDeleted === "boolean"
                    ? params.isDeleted
                    : null,

            rating:
                typeof params.rating === "number"
                    ? params.rating
                    : null,

            reviewerId:
                params.reviewerId ?? null,

            revieweeId:
                params.revieweeId ?? null,

            bookingId:
                params.bookingId ?? null,

            limit:
                params.limit,

            page:
                params.page,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:review:list:${hashPayload(payload)}`;
    },

    myBookingReview(
        bookingId: string,
        userId: string,
    ): string {
        return `${CACHE_PREFIX}:review:booking:${bookingId}:user:${userId}`;
    },

    myReviewList(
        params: {
            userId: string;
            rating?: number | undefined;
            direction?: string | undefined;
            limit: number;
            page: number;
            sortBy: string;
            sortOrder: "asc" | "desc";
        },
    ): string {
        return `${CACHE_PREFIX}:review:mine:${hashPayload(params)}`;
    },

    coordinatorReviewList(
        params: {
            coordinatorId: string;
            rating?: number | undefined;
            limit: number;
            page: number;
            sortBy: string;
            sortOrder: "asc" | "desc";
        },
    ): string {
        return `${CACHE_PREFIX}:review:coordinator:${hashPayload(params)}`;
    },

    reviewListPattern(): string {
        return `${CACHE_PREFIX}:review:list:*`;
    },

    myBookingReviewPattern(): string {
        return `${CACHE_PREFIX}:review:booking:*`;
    },

    myReviewListPattern(): string {
        return `${CACHE_PREFIX}:review:mine:*`;
    },

    coordinatorReviewListPattern(): string {
        return `${CACHE_PREFIX}:review:coordinator:*`;
    },

    userQueryMyList(
        params: {
            requesterId: string;
            status?: string | undefined;
            category?: string | undefined;
            limit: number;
            page: number;
            sortBy: string;
            sortOrder: "asc" | "desc";
        },
    ): string {
        const payload = {
            requesterId:
                params.requesterId,

            status:
                params.status ?? null,

            category:
                params.category ?? null,

            limit:
                params.limit,

            page:
                params.page,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:user-query:my-list:${hashPayload(payload)}`;
    },

    userQueryUserDetail(
        queryId: string,
        requesterId: string,
    ): string {
        return `${CACHE_PREFIX}:user-query:user-detail:${queryId}:${requesterId}`;
    },

    userQueryAdminList(
        params: {
            searchTerm?: string | undefined;
            status?: string | undefined;
            category?: string | undefined;
            priority?: string | undefined;
            requesterType?: string | undefined;
            assignedAdminId?: string | undefined;
            requesterId?: string | undefined;
            isDeleted: boolean;
            limit: number;
            page: number;
            sortBy: string;
            sortOrder: "asc" | "desc";
        },
    ): string {
        const payload = {
            searchTerm:
                params.searchTerm
                    ?.trim()
                    .toLowerCase() ?? "",

            status:
                params.status ?? null,

            category:
                params.category ?? null,

            priority:
                params.priority ?? null,

            requesterType:
                params.requesterType ?? null,

            assignedAdminId:
                params.assignedAdminId ?? null,

            requesterId:
                params.requesterId ?? null,

            isDeleted:
                params.isDeleted,

            limit:
                params.limit,

            page:
                params.page,

            sortBy:
                params.sortBy,

            sortOrder:
                params.sortOrder,
        };

        return `${CACHE_PREFIX}:user-query:admin-list:${hashPayload(payload)}`;
    },

    userQueryAdminDetail(
        queryId: string,
    ): string {
        return `${CACHE_PREFIX}:user-query:admin-detail:${queryId}`;
    },

    userQueryMyListPattern(): string {
        return `${CACHE_PREFIX}:user-query:my-list:*`;
    },

    userQueryUserDetailPattern(): string {
        return `${CACHE_PREFIX}:user-query:user-detail:*`;
    },

    userQueryAdminListPattern(): string {
        return `${CACHE_PREFIX}:user-query:admin-list:*`;
    },

    userQueryAdminDetailPattern(): string {
        return `${CACHE_PREFIX}:user-query:admin-detail:*`;
    },

    taxProfileList(
        params: {
            search?: string | undefined;
            treatment?: string | undefined;
            isActive?: boolean | undefined;
            page: number;
            limit: number;
        },
    ): string {
        const payload = {
            search:
                params.search
                    ?.trim()
                    .toLowerCase() ?? "",

            treatment:
                params.treatment ?? null,

            isActive:
                typeof params.isActive === "boolean"
                    ? params.isActive
                    : null,

            page:
                params.page,

            limit:
                params.limit,
        };

        return `${CACHE_PREFIX}:tax-profile:list:${hashPayload(payload)}`;
    },

    activeTaxProfileList(): string {
        return `${CACHE_PREFIX}:tax-profile:active-list`;
    },

    taxProfileDetail(
        taxProfileId: string,
    ): string {
        return `${CACHE_PREFIX}:tax-profile:detail:${taxProfileId}`;
    },

    taxProfileListPattern(): string {
        return `${CACHE_PREFIX}:tax-profile:list:*`;
    },

    taxProfileDetailPattern(): string {
        return `${CACHE_PREFIX}:tax-profile:detail:*`;
    },

    chatParticipantIds(
        userId: string,
    ): string {
        return `${CACHE_PREFIX}:chat:participant-ids:${userId}`;
    },

    chatParticipantIdsPattern(): string {
        return `${CACHE_PREFIX}:chat:participant-ids:*`;
    },

    rbacPermissionList(
        params: {
            module?: string | undefined;
            isActive?: boolean | undefined;
            page: number;
            limit: number;
        },
    ): string {
        const payload = {
            module:
                params.module
                    ?.trim()
                    .toLowerCase() ?? "",

            isActive:
                typeof params.isActive === "boolean"
                    ? params.isActive
                    : null,

            page:
                params.page,

            limit:
                params.limit,
        };

        return `${CACHE_PREFIX}:rbac:permission:list:${hashPayload(payload)}`;
    },

    rbacPermissionDetail(
        permissionId: string,
    ): string {
        return `${CACHE_PREFIX}:rbac:permission:detail:${permissionId}`;
    },

    rbacRoleList(
        params: {
            isActive?: boolean | undefined;
            page: number;
            limit: number;
        },
    ): string {
        const payload = {
            isActive:
                typeof params.isActive === "boolean"
                    ? params.isActive
                    : null,

            page:
                params.page,

            limit:
                params.limit,
        };

        return `${CACHE_PREFIX}:rbac:role:list:${hashPayload(payload)}`;
    },

    rbacRoleDetail(
        roleId: string,
    ): string {
        return `${CACHE_PREFIX}:rbac:role:detail:${roleId}`;
    },

    rbacUserAccess(
        userId: string,
    ): string {
        return `${CACHE_PREFIX}:rbac:user-access:${userId}`;
    },

    rbacPermissionListPattern(): string {
        return `${CACHE_PREFIX}:rbac:permission:list:*`;
    },

    rbacPermissionDetailPattern(): string {
        return `${CACHE_PREFIX}:rbac:permission:detail:*`;
    },

    rbacRoleListPattern(): string {
        return `${CACHE_PREFIX}:rbac:role:list:*`;
    },

    rbacRoleDetailPattern(): string {
        return `${CACHE_PREFIX}:rbac:role:detail:*`;
    },

    rbacUserAccessPattern(): string {
        return `${CACHE_PREFIX}:rbac:user-access:*`;
    },

    packageFullByCitiesPatternAll():
        string {
        return `${CACHE_PREFIX}:package:full-by-cities:*`;
    }
} as const;