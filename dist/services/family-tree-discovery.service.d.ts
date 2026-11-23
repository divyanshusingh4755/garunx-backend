export interface FamilyDiscoveryInput {
    fatherName: string;
    grandfatherName: string;
    nativeVillage?: string;
}
export declare class FamilyTreeDiscoveryService {
    static discover(actorId: string, input: FamilyDiscoveryInput): Promise<{
        possibleMatchFound: boolean;
        matchCount: number;
        requiresOwnerApproval: boolean;
        candidates?: never;
    } | {
        possibleMatchFound: boolean;
        matchCount: number;
        candidates: {
            discoveryToken: string;
            matchType: string;
            requiresOwnerApproval: boolean;
        }[];
        requiresOwnerApproval?: never;
    }>;
}
//# sourceMappingURL=family-tree-discovery.service.d.ts.map