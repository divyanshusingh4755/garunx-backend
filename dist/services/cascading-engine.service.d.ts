import { Types, type ClientSession } from "mongoose";
interface ServiceTierReference {
    tierId: Types.ObjectId;
}
interface ServiceLocationReference {
    locationId: Types.ObjectId;
    isActive: boolean;
}
interface ServiceConfigurationDocument {
    _id: Types.ObjectId;
    tiers: ServiceTierReference[];
    locations: ServiceLocationReference[];
}
interface ServiceCascadeDocument extends ServiceConfigurationDocument {
    isComplete: boolean;
    isActive: boolean;
    startingPrice: number;
    save(options: {
        session: ClientSession;
    }): Promise<unknown>;
}
export interface ServiceConfigurationEvaluation {
    isComplete: boolean;
    issues: string[];
}
export declare class ServiceCascadingEngine {
    static run(serviceId: string, externalSession?: ClientSession): Promise<void>;
    static evaluateConfiguration(serviceId: string, externalSession?: ClientSession): Promise<ServiceConfigurationEvaluation>;
    private static runInSession;
    private static getValidIdStrings;
    static cleanupTierOrphans(service: ServiceCascadeDocument, session: ClientSession): Promise<void>;
    static cleanupLocationOrphans(service: ServiceCascadeDocument, session: ClientSession): Promise<void>;
    static cleanupComponentOrphans(service: ServiceCascadeDocument, session: ClientSession): Promise<void>;
    static cleanupPricing(service: ServiceCascadeDocument, session: ClientSession): Promise<void>;
    private static evaluateConfigurationForService;
    static computeIsComplete(service: ServiceCascadeDocument, session: ClientSession): Promise<boolean>;
    private static computeStartingPrice;
}
export {};
//# sourceMappingURL=cascading-engine.service.d.ts.map