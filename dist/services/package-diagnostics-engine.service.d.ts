type Severity = "blocking" | "warning" | "info";
interface DiagnosticIssue {
    code: string;
    message: string;
    severity: Severity;
    meta?: any;
}
export declare class PackageDiagnosticsEngine {
    static analyze(packageId: string): Promise<{
        packageId: string;
        packageName: string;
        isActive: boolean;
        isComplete: boolean;
        summary: {
            totalIssues: number;
            blocking: number;
            warnings: number;
        };
        issues: DiagnosticIssue[];
    }>;
}
export {};
//# sourceMappingURL=package-diagnostics-engine.service.d.ts.map