import type { Request } from "express";
export interface ClientInfo {
    userAgent: string;
    ip: string;
}
export declare const getClientIp: (req: Request) => ClientInfo;
//# sourceMappingURL=clientIp.d.ts.map