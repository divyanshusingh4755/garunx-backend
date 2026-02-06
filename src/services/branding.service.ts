import { Branding, type IBrand } from "../models/branding.model.js"

class BrandingService {
    static async getAppTheme() {
        const branding = await Branding.findOne({ isActive: true }).sort({ createdAt: -1 }).exec()
        if (!branding) {
            throw new Error("No active theme found")
        }
        return branding.theme
    }

    static async updateAppTheme(newTheme: Partial<IBrand['theme']>) {
        const latest = await Branding.findOne().sort({ version: -1 })
        const nextVersion = latest ? Number(latest.version) + 1 : 1;

        await Branding.updateMany(
            { isActive: true },
            { $set: { isActive: false } }
        )

        // Create a new one
        const newBranding = await Branding.create({
            theme: newTheme,
            isActive: true,
            version: nextVersion
        })

        return newBranding
    }
}

export default BrandingService