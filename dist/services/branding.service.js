import mongoose, {} from "mongoose";
import { Branding, } from "../models/branding.model.js";
class BrandingService {
    static async getAppTheme() {
        const branding = await Branding.findOne({
            isActive: true,
        })
            .sort({ version: -1 })
            .lean();
        if (!branding) {
            throw new Error("No active theme found");
        }
        return branding.theme;
    }
    static async updateAppTheme(newTheme) {
        if (!newTheme ||
            typeof newTheme !== "object" ||
            Array.isArray(newTheme) ||
            Object.keys(newTheme).length === 0) {
            throw new Error("At least one theme field is required");
        }
        const session = await mongoose.startSession();
        try {
            session.startTransaction();
            const latest = await Branding.findOne()
                .sort({ version: -1 })
                .session(session)
                .lean();
            const currentTheme = latest?.theme ?? {
                primary: "#007bff",
                secondary: "#6c757d",
                accent: "#ffc107",
                background: "#ffffff",
                text: "#212259",
            };
            const mergedTheme = {
                primary: newTheme.primary ?? currentTheme.primary,
                secondary: newTheme.secondary ?? currentTheme.secondary,
                accent: newTheme.accent ?? currentTheme.accent,
                background: newTheme.background ?? currentTheme.background,
                text: newTheme.text ?? currentTheme.text,
            };
            const nextVersion = latest ? latest.version + 1 : 1;
            await Branding.updateMany({ isActive: true }, {
                $set: {
                    isActive: false,
                },
            }, {
                session,
            });
            const createdDocuments = await Branding.create([
                {
                    version: nextVersion,
                    isActive: true,
                    theme: mergedTheme,
                },
            ], {
                session,
            });
            const createdBranding = createdDocuments[0];
            if (!createdBranding) {
                throw new Error("Theme creation failed");
            }
            await session.commitTransaction();
            return createdBranding;
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
}
export default BrandingService;
//# sourceMappingURL=branding.service.js.map