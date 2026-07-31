import { Types, type ClientSession } from "mongoose";
interface ServiceTierReference {
    tierId: Types.ObjectId;
}
interface ServiceLocationReference {
    locationId: Types.ObjectId;
    isActive: boolean;
}
interface ServiceCascadeDocument {
    _id: Types.ObjectId;
    tiers: ServiceTierReference[];
    locations: ServiceLocationReference[];
    isComplete: boolean;
    isActive: boolean;
    save(options: {
        session: ClientSession;
    }): Promise<unknown>;
}
export declare class ServiceCascadingEngine {
    static run(serviceId: string): Promise<void>;
    private static getValidIdStrings;
    static cleanupTierOrphans(service: ServiceCascadeDocument, session: ClientSession): Promise<void>;
    static cleanupLocationOrphans(service: ServiceCascadeDocument, session: ClientSession): Promise<void>;
    static cleanupComponentOrphans(service: ServiceCascadeDocument, session: ClientSession): Promise<void>;
    static cleanupPricing(service: ServiceCascadeDocument, session: ClientSession): Promise<void>;
    static computeIsComplete(service: ServiceCascadeDocument, session: ClientSession): Promise<boolean>;
}
export {};
//# sourceMappingURL=cascading-engine.service.d.ts.map