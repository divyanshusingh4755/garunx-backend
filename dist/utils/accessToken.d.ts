import { type JwtPayload } from "jsonwebtoken";
import { Role } from "../types/rbac.js";
export interface AccessTokenPayload extends JwtPayload {
    userId: string;
    role: Role;
}
export declare const getAccessSecret: () => string;
export declare const verifyAccessToken: (token: string) => AccessTokenPayload | null;
//# sourceMappingURL=accessToken.d.ts.map