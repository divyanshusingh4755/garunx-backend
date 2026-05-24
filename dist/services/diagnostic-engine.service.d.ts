type Severity = "blocking" | "warning" | "info";
interface DiagnosticIssue {
    code: string;
    message: string;
    severity: Severity;
    meta?: any;
}
export declare class ServiceDiagnosticsEngine {
    static analyze(serviceId: string): Promise<{
        serviceId: string;
        serviceName: string;
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
//# sourceMappingURL=diagnostic-engine.service.d.ts.map