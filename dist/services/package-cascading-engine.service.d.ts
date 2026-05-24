export declare class PackageCascadingEngine {
    static run(packageId: string): Promise<void>;
    static cleanupTierOrphans(pkg: any, session: any): Promise<void>;
    static cleanupLocationOrphans(pkg: any, session: any): Promise<void>;
    static cleanupServiceOrphans(pkg: any, session: any): Promise<void>;
    static cleanupPricing(pkg: any, session: any): Promise<void>;
    static computeIsComplete(pkg: any, session: any): Promise<boolean>;
}
//# sourceMappingURL=package-cascading-engine.service.d.ts.map