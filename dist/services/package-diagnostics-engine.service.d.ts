type Severity = "blocking" | "warning" | "info";
type DiagnosticMeta = Record<string, unknown> | readonly unknown[];
interface DiagnosticIssue {
    code: string;
    message: string;
    severity: Severity;
    meta?: DiagnosticMeta;
}
export interface PackageDiagnosticResult {
    packageId: string;
    packageName: string;
    isActive: boolean;
    isComplete: boolean;
    summary: {
        totalIssues: number;
        blocking: number;
        warnings: number;
        info: number;
    };
    issues: DiagnosticIssue[];
}
export declare class PackageDiagnosticsEngine {
    private static safeObjectIdString;
    private static findDuplicates;
    static analyze(packageId: string): Promise<PackageDiagnosticResult>;
}
export {};
//# sourceMappingURL=package-diagnostics-engine.service.d.ts.map