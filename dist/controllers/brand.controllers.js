import BrandingService from "../services/branding.service.js";
export const getTheme = async (req, res) => {
    try {
        const theme = await BrandingService.getAppTheme();
        res.status(200).json({ success: true, theme });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to get app theme'
        });
    }
};
export const updateTheme = async (req, res) => {
    try {
        await BrandingService.updateAppTheme(req.body.theme);
        res.status(201).json({ success: true, message: "Theme updated successfully" });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update brand theme'
        });
    }
};
//# sourceMappingURL=brand.controllers.js.map