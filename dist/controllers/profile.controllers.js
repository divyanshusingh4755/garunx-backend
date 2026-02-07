import ProfileService from "../services/profile.service.js";
export const completeProfile = async (req, res) => {
    try {
        const { userId, fullName, phoneNumber, email, dob, gender, referralCode, password, profileImage } = req.body;
        // Call service to handle logic
        const profile = await ProfileService.completeProfile(userId, fullName, phoneNumber, email, dob, gender, referralCode, password, profileImage);
        res.status(200).send({
            success: true,
            message: "Profile updated successfully",
            data: profile
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Profile Updation failed'
        });
    }
};
export const getGetAllProfile = async (req, res) => {
    try {
        const { limit, page } = req.query;
        const { profiles, pagination } = await ProfileService.getGetAllProfile(Number(page) || 1, Number(limit) || 40);
        res.status(200).json({ success: true, data: profiles, pagination });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Error Getting User Profile. Please try again later." });
    }
};
export const getProfileById = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await ProfileService.getProfileById(id);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        const status = error.message.includes("not found") ? 404 : 500;
        res.status(status).json({ success: false, message: "Error Getting User Profile data by id. Please try again later." });
    }
};
export const getProfileByEmailorPhone = async (req, res) => {
    try {
        const { identifier } = req.params;
        const data = await ProfileService.getProfileByEmailorPhone(identifier);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        const status = error.message.includes("found") ? 404 : 500;
        res.status(status).json({ success: false, message: "Error Getting User Profile data by email or phone. Please try again later." });
    }
};
export const deleteProfile = async (req, res) => {
    try {
        const { id } = req.params;
        await ProfileService.deleteProfile(id);
        res.status(200).json({ success: true, message: "Profile deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Error deleting User profile. Please try again later." });
    }
};
export const uploadSingle = async (req, res) => {
    try {
        res.json({ success: true, url: req.file.location });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to upload single image'
        });
    }
};
export const uploadMutliple = async (req, res) => {
    try {
        const urls = req.files.map(file => file.location);
        res.json({ success: true, urls });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to upload multiple image'
        });
    }
};
//# sourceMappingURL=profile.controllers.js.map