interface ResolveTreeOwnerParams {
    actorId: string;
    actorRole?: string;
    requestedOwnerId?: string;
}
export interface ResolvedFamilyTreeAccess {
    ownerId: string;
    bookingId?: string;
    bookingReference?: string;
}
export declare const resolveFamilyTreeOwnerId: ({ actorId, actorRole, requestedOwnerId, }: ResolveTreeOwnerParams) => Promise<ResolvedFamilyTreeAccess>;
export {};
//# sourceMappingURL=access.service.d.ts.map