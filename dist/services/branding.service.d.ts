import { type HydratedDocument } from "mongoose";
import { type IBrand, type IBrandTheme } from "../models/branding.model.js";
declare class BrandingService {
    static getAppTheme(): Promise<IBrandTheme>;
    static updateAppTheme(newTheme: Partial<IBrandTheme>): Promise<HydratedDocument<IBrand>>;
}
export default BrandingService;
//# sourceMappingURL=branding.service.d.ts.map