import { Role } from "./rbac.ts";

declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                role: Role,
            }
        }
    }
}