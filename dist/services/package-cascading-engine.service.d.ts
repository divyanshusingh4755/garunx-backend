import { Types, type ClientSession } from "mongoose";
interface PackageTierReference {
    tierId: Types.ObjectId;
}
interface PackageLocationReference {
    locationId: Types.ObjectId;
    isActive: boolean;
}
interface PackageCascadeDocument {
    _id: Types.ObjectId;
    tiers: PackageTierReference[];
    locations: PackageLocationReference[];
    isComplete: boolean;
    isActive: boolean;
    startingPrice: number;
    save(options: {
        session: ClientSession;
    }): Promise<unknown>;
}
export declare class PackageCascadingEngine {
    static evaluateConfiguration(packageId: string): Promise<{
        isComplete: boolean;
        issues: string[];
        startingPrice: number;
    }>;
    static run(packageId: string, externalSession?: ClientSession): Promise<void>;
    private static runInSession;
    private static getValidIdStrings;
    static cleanupTierOrphans(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<void>;
    static cleanupLocationOrphans(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<void>;
    static cleanupMappingOrphans(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<void>;
    static cleanupPricing(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<void>;
    static computeStartingPrice(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<number>;
    static computeIsComplete(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<boolean>;
}
export {};
//# sourceMappingURL=package-cascading-engine.service.d.ts.map