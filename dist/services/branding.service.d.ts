import { type IBrand } from "../models/branding.model.js";
declare class BrandingService {
    static getAppTheme(): Promise<{
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    }>;
    static updateAppTheme(newTheme: Partial<IBrand['theme']>): Promise<import("mongoose").Document<unknown, {}, IBrand, {}, import("mongoose").DefaultSchemaOptions> & IBrand & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
}
export default BrandingService;
//# sourceMappingURL=branding.service.d.ts.map