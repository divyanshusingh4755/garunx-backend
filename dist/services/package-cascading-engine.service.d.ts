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
    static run(packageId: string): Promise<void>;
    private static getValidIdStrings;
    static cleanupTierOrphans(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<void>;
    static cleanupLocationOrphans(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<void>;
    static cleanupMappingOrphans(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<void>;
    static cleanupPricing(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<void>;
    private static computeStartingPrice;
    static computeIsComplete(packageDocument: PackageCascadeDocument, session: ClientSession): Promise<boolean>;
}
export {};
//# sourceMappingURL=package-cascading-engine.service.d.ts.map