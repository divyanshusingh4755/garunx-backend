type Severity = "blocking" | "warning" | "info";
type DiagnosticMeta = Record<string, unknown> | readonly unknown[];
interface DiagnosticIssue {
    code: string;
    message: string;
    severity: Severity;
    meta?: DiagnosticMeta;
}
export interface ServiceDiagnosticResult {
    serviceId: string;
    serviceName: string;
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
export declare class ServiceDiagnosticsEngine {
    private static safeObjectIdString;
    private static findDuplicates;
    static analyze(serviceId: string): Promise<ServiceDiagnosticResult>;
}
export {};
//# sourceMappingURL=diagnostic-engine.service.d.ts.map