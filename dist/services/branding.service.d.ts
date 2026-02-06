import { type IBrand } from "../models/branding.model.js";
declare class BrandingService {
    static getAppTheme(): Promise<{
        primary: String;
        secondary: String;
        accent: String;
        background: String;
        text: String;
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