export declare class ServiceCascadingEngine {
    static run(serviceId: string): Promise<void>;
    static cleanupTierOrphans(service: any, session: any): Promise<void>;
    static cleanupLocationOrphans(service: any, session: any): Promise<void>;
    static cleanupComponentOrphans(service: any, session: any): Promise<void>;
    static cleanupPricing(service: any, session: any): Promise<void>;
    static computeIsComplete(service: any, session: any): Promise<boolean>;
}
//# sourceMappingURL=cascading-engine.service.d.ts.map