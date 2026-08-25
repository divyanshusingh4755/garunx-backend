import { CouponService } from "../services/coupon.service.js";
const getErrorMessage = (error, fallback) => error instanceof Error ? error.message : fallback;
const getErrorStatus = (error) => {
    if (error instanceof Error && error.message === "Coupon not found") {
        return 404;
    }
    if (error instanceof Error && error.message.includes("already exists")) {
        return 409;
    }
    return 400;
};
export const createCoupon = async (req, res) => {
    try {
        const { name, couponCode, applicableOn, services, packages, assignedUserId, discount, discountType, usageLimit, validFrom, validTill, minOrderAmount, maxDiscountAmount, isFirstOrderOnly } = req.body;
        const couponData = {
            name,
            couponCode,
            applicableOn,
            services: services ?? [],
            packages: packages ?? [],
            discount,
            discountType,
            usageLimit: usageLimit ?? 0,
            minOrderAmount: minOrderAmount ?? 0,
            isFirstOrderOnly: isFirstOrderOnly ?? false,
        };
        if (assignedUserId !== undefined) {
            couponData.assignedUserId = assignedUserId;
        }
        if (validFrom !== undefined) {
            couponData.validFrom = new Date(validFrom);
        }
        if (validTill !== undefined) {
            couponData.validTill = new Date(validTill);
        }
        if (maxDiscountAmount !== undefined) {
            couponData.maxDiscountAmount = maxDiscountAmount;
        }
        const coupon = await CouponService.createCoupon(couponData);
        return res.status(201).json({
            success: true,
            message: "Coupon created successfully",
            data: coupon,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to create coupon"),
        });
    }
};
export const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = {};
        const directFields = ["name", "couponCode", "applicableOn", "services", "packages", "assignedUserId", "discount", "discountType", "usageLimit", "minOrderAmount", "maxDiscountAmount", "isFirstOrderOnly"];
        for (const field of directFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                Object.assign(updateData, { [field]: req.body[field] });
            }
        }
        if (Object.prototype.hasOwnProperty.call(req.body, "validFrom")) {
            updateData.validFrom = new Date(req.body.validFrom);
        }
        if (Object.prototype.hasOwnProperty.call(req.body, "validTill")) {
            updateData.validTill = new Date(req.body.validTill);
        }
        const coupon = await CouponService.updateCoupon(id, updateData);
        return res.status(200).json({
            success: true,
            message: "Coupon updated successfully",
            data: coupon,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to update coupon"),
        });
    }
};
export const validateCoupon = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access",
            });
        }
        const { couponCode, serviceId, packageId, amount } = req.body;
        const input = {
            couponCode,
            orderAmount: amount,
            userId,
            ...(serviceId !== undefined && { serviceId }),
            ...(packageId !== undefined && { packageId }),
        };
        const result = await CouponService.validateCoupon(input);
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: getErrorMessage(error, "Failed to validate coupon"),
        });
    }
};
export const getCouponById = async (req, res) => {
    try {
        const coupon = await CouponService.getCouponById(req.params.id);
        return res.status(200).json({
            success: true,
            data: coupon,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch coupon"),
        });
    }
};
export const deleteCoupon = async (req, res) => {
    try {
        await CouponService.deleteCoupon(req.params.id);
        return res.status(200).json({
            success: true,
            message: "Coupon deleted successfully",
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to delete coupon"),
        });
    }
};
export const toggleCouponStatus = async (req, res) => {
    try {
        const coupon = await CouponService.toggleCouponStatus(req.params.id);
        return res.status(200).json({
            success: true,
            message: `Coupon ${coupon.isActive ? "activated" : "deactivated"} successfully`,
            data: coupon,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to update coupon status"),
        });
    }
};
export const getAllCoupons = async (req, res) => {
    try {
        const { searchTerm, isActive, assignedUserId, applicableOn, limit, page, sortBy, sortOrder } = req.query;
        const parsedLimit = typeof limit === "number" ? limit : Number(limit);
        const parsedPage = typeof page === "number" ? page : Number(page);
        const result = await CouponService.findCoupons(typeof searchTerm === "string" ? searchTerm : undefined, Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20, Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1, isActive === "true" ? true : isActive === "false" ? false : undefined, typeof assignedUserId === "string" ? assignedUserId : undefined, typeof applicableOn === "string" || Array.isArray(applicableOn) ? applicableOn : undefined, typeof sortBy === "string" ? sortBy : "createdAt", sortOrder === "asc" ? "asc" : "desc");
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch coupons"),
        });
    }
};
export const getAvailableCoupons = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access",
            });
        }
        const { serviceId, packageId, amount } = req.query;
        const coupons = await CouponService.getAvailableCoupons({
            userId,
            ...(typeof serviceId === "string" && { serviceId }),
            ...(typeof packageId === "string" && { packageId }),
            ...(amount !== undefined && { orderAmount: Number(amount) }),
        });
        return res.status(200).json({
            success: true,
            message: "Available coupons fetched successfully",
            data: coupons,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch available coupons"),
        });
    }
};
export const exportCouponsCsv = async (req, res) => {
    try {
        const { couponIds } = req.body;
        const result = await CouponService.exportCouponsToCsv(couponIds);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="coupons-${timestamp}.csv"`);
        return res.status(200).send(result.csv);
    }
    catch (error) {
        const message = getErrorMessage(error, "Failed to export coupons");
        if (message === "No coupons found for export") {
            return res.status(404).json({
                success: false,
                message,
            });
        }
        return res.status(400).json({
            success: false,
            message,
        });
    }
};
//# sourceMappingURL=coupon.controllers.js.map