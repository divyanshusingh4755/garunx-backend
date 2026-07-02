import { CouponService } from "../services/coupon.service.js";
export const createCoupon = async (req, res) => {
    try {
        const { name, couponCode, applicableOn, services, packages, discount, discountType, usageLimit, validFrom, validTill, minOrderAmount, maxDiscountAmount, isFirstOrderOnly, isActive, } = req.body;
        const coupon = await CouponService.createCoupon({
            name,
            couponCode,
            applicableOn,
            services: services || [],
            packages: packages || [],
            discount: Number(discount),
            discountType,
            usageLimit: Number(usageLimit) || 0,
            validFrom,
            validTill,
            minOrderAmount: Number(minOrderAmount) || 0,
            isFirstOrderOnly: isFirstOrderOnly ?? false,
            isActive: isActive ?? true,
            ...(maxDiscountAmount !== undefined
                ? { maxDiscountAmount: Number(maxDiscountAmount) }
                : {}),
        });
        return res.status(201).json({
            success: true,
            message: "Coupon created successfully",
            data: coupon,
        });
    }
    catch (error) {
        const status = error.message?.includes("already exists") ? 409 : 400;
        return res.status(status).json({
            success: false,
            message: error.message,
        });
    }
};
export const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, couponCode, applicableOn, services, packages, discount, discountType, usageLimit, validFrom, validTill, minOrderAmount, maxDiscountAmount, isFirstOrderOnly, isActive, } = req.body;
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (couponCode !== undefined)
            updateData.couponCode = couponCode;
        if (applicableOn !== undefined)
            updateData.applicableOn = applicableOn;
        if (services !== undefined)
            updateData.services = services;
        if (packages !== undefined)
            updateData.packages = packages;
        if (discount !== undefined)
            updateData.discount = Number(discount);
        if (discountType !== undefined)
            updateData.discountType = discountType;
        if (usageLimit !== undefined)
            updateData.usageLimit = Number(usageLimit);
        if (validFrom !== undefined)
            updateData.validFrom = new Date(validFrom);
        if (validTill !== undefined)
            updateData.validTill = new Date(validTill);
        if (minOrderAmount !== undefined)
            updateData.minOrderAmount = Number(minOrderAmount);
        if (maxDiscountAmount !== undefined)
            updateData.maxDiscountAmount = Number(maxDiscountAmount);
        if (isFirstOrderOnly !== undefined)
            updateData.isFirstOrderOnly = isFirstOrderOnly;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        const coupon = await CouponService.updateCoupon(id, updateData);
        return res.status(200).json({
            success: true,
            message: "Coupon updated successfully",
            data: coupon,
        });
    }
    catch (error) {
        const status = error.message === "Coupon not found"
            ? 404
            : error.message?.includes("already exists")
                ? 409
                : 400;
        return res.status(status).json({
            success: false,
            message: error.message,
        });
    }
};
export const validateCoupon = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { couponCode, serviceId, packageId, amount, isFirstOrder } = req.body;
        if (!userId) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized access" });
        }
        const result = await CouponService.validateCoupon({
            couponCode,
            serviceId,
            packageId,
            orderAmount: Number(amount),
            userId,
            isFirstOrder: Boolean(isFirstOrder),
        });
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getCouponById = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await CouponService.getCouponById(id);
        res.status(200).json({
            success: true,
            data: coupon,
        });
    }
    catch (error) {
        res.status(error.message === "Coupon not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        await CouponService.deleteCoupon(id);
        res.status(200).json({
            success: true,
            message: "Coupon deleted successfully",
        });
    }
    catch (error) {
        res.status(error.message === "Coupon not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const toggleCouponStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await CouponService.toggleCouponStatus(id);
        res.status(200).json({
            success: true,
            message: `Coupon ${coupon.isActive ? "activated" : "deactivated"} successfully`,
            data: coupon,
        });
    }
    catch (error) {
        res.status(error.message === "Coupon not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getAllCoupons = async (req, res) => {
    try {
        const { searchTerm, isActive, assignedUserId, applicableOn, limit, page, sortBy, sortOrder, } = req.query;
        const result = await CouponService.findCoupons(searchTerm, Number(limit) || 20, Number(page) || 1, isActive === "true" ? true : isActive === "false" ? false : undefined, assignedUserId, applicableOn, sortBy || "createdAt", sortOrder || "desc");
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch coupons",
        });
    }
};
//# sourceMappingURL=coupon.controllers.js.map