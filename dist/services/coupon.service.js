import { Coupon } from "../models/coupon.model.js";
export class CouponService {
    static async createCoupon(couponData) {
        if (!couponData.couponCode) {
            throw new Error("Coupon code is required");
        }
        const existingCoupon = await Coupon.findOne({
            couponCode: couponData.couponCode.toUpperCase(),
        });
        if (existingCoupon) {
            throw new Error(`Coupon code '${couponData.couponCode}' already exists`);
        }
        if (couponData.validFrom &&
            couponData.validTill &&
            couponData.validTill < couponData.validFrom) {
            throw new Error("validTill must be greater than validFrom");
        }
        if (couponData.applicableOn === "SERVICE" &&
            (!couponData.services || couponData.services.length === 0)) {
            throw new Error("At least one service is required for SERVICE coupons");
        }
        if (couponData.applicableOn === "PACKAGE" &&
            (!couponData.packages || couponData.packages.length === 0)) {
            throw new Error("At least one package is required for PACKAGE coupons");
        }
        const coupon = new Coupon(couponData);
        return await coupon.save();
    }
    static async updateCoupon(id, updateData) {
        if (updateData.couponCode) {
            const existingCoupon = await Coupon.findOne({
                couponCode: updateData.couponCode,
                _id: { $ne: id },
            });
            if (existingCoupon) {
                throw new Error(`Coupon code '${updateData.couponCode}' already exists`);
            }
        }
        const existingCoupon = await Coupon.findById(id);
        if (!existingCoupon) {
            throw new Error("Coupon not found");
        }
        const validFrom = updateData.validFrom ?? existingCoupon.validFrom;
        const validTill = updateData.validTill ?? existingCoupon.validTill;
        if (validFrom && validTill && validTill < validFrom) {
            throw new Error("validTill must be greater than validFrom");
        }
        const applicableOn = updateData.applicableOn ?? existingCoupon.applicableOn;
        const services = updateData.services ?? existingCoupon.services;
        const packages = updateData.packages ?? existingCoupon.packages;
        if (applicableOn === "SERVICE" && (!services || services.length === 0)) {
            throw new Error("At least one service is required for SERVICE coupons");
        }
        if (applicableOn === "PACKAGE" && (!packages || packages.length === 0)) {
            throw new Error("At least one package is required for PACKAGE coupons");
        }
        const coupon = await Coupon.findByIdAndUpdate(id, { $set: updateData }, {
            new: true,
            runValidators: true,
        });
        return coupon;
    }
    static async getCouponById(id) {
        const coupon = await Coupon.findById(id)
            .populate("services", "name")
            .populate("packages", "name")
            .lean();
        if (!coupon) {
            throw new Error("Coupon not found");
        }
        return coupon;
    }
    static async deleteCoupon(id) {
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            throw new Error("Coupon not found");
        }
        return await Coupon.findByIdAndDelete(id);
    }
    static async toggleCouponStatus(id) {
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            throw new Error("Coupon not found");
        }
        coupon.isActive = !coupon.isActive;
        await coupon.save();
        return coupon;
    }
    static async findCoupons(searchTerm, limit = 20, page = 1, isActive, assignedUserId, applicableOn, sortBy = "createdAt", sortOrder = "desc") {
        const skip = limit * (page - 1);
        const query = {};
        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }
        if (assignedUserId) {
            query.assignedUserId = assignedUserId;
        }
        if (applicableOn) {
            query.applicableOn = applicableOn;
        }
        if (searchTerm) {
            query.$or = [
                {
                    name: {
                        $regex: searchTerm,
                        $options: "i",
                    },
                },
                {
                    couponCode: {
                        $regex: searchTerm,
                        $options: "i",
                    },
                },
            ];
        }
        const sortCriteria = {
            [sortBy]: sortOrder === "desc" ? -1 : 1,
        };
        try {
            const [data, total] = await Promise.all([
                Coupon.find(query)
                    .populate("services", "name")
                    .populate("packages", "name")
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Coupon.countDocuments(query),
            ]);
            return {
                data,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            throw new Error(`Coupon fetch failed: ${error.message}`);
        }
    }
    static async validateCoupon({ couponCode, serviceId, packageId, orderAmount, userId, isFirstOrder = false, }) {
        const coupon = await Coupon.findOne({
            couponCode: couponCode.toUpperCase(),
            isActive: true,
        });
        if (!coupon) {
            throw new Error("Invalid coupon code");
        }
        const now = new Date();
        if (coupon.validFrom && coupon.validFrom > now) {
            throw new Error("Coupon is not active yet");
        }
        if (coupon.validTill && coupon.validTill < now) {
            throw new Error("Coupon has expired");
        }
        if (coupon.assignedUserId && coupon.assignedUserId.toString() !== userId) {
            throw new Error("This coupon does not belong to you");
        }
        switch (coupon.applicableOn) {
            case "SERVICE":
                if (!serviceId) {
                    throw new Error("This coupon is applicable only for services");
                }
                if (coupon.services && coupon.services.length > 0) {
                    const isApplicable = coupon.services.some((item) => {
                        const targetId = item && typeof item === 'object' && '_id' in item ? item._id : item;
                        return targetId?.toString() === serviceId;
                    });
                    if (!isApplicable) {
                        throw new Error("Coupon is not applicable for this service");
                    }
                }
                break;
            case "PACKAGE":
                if (!packageId) {
                    throw new Error("This coupon is applicable only for packages");
                }
                if (coupon.packages && coupon.packages.length > 0) {
                    const isApplicable = coupon.packages.some((item) => {
                        const targetId = item && typeof item === 'object' && '_id' in item ? item._id : item;
                        return targetId?.toString() === packageId;
                    });
                    if (!isApplicable) {
                        throw new Error("Coupon is not applicable for this package");
                    }
                }
                break;
            case "ALL":
                break;
        }
        if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
            throw new Error("Coupon usage limit reached");
        }
        if (orderAmount < coupon.minOrderAmount) {
            throw new Error(`Minimum order amount is ₹${coupon.minOrderAmount}`);
        }
        if (coupon.isFirstOrderOnly && !isFirstOrder) {
            throw new Error("Coupon is valid only for first order");
        }
        let discountAmount = 0;
        if (coupon.discountType === "PERCENTAGE") {
            discountAmount = (orderAmount * coupon.discount) / 100;
            if (coupon.maxDiscountAmount &&
                discountAmount > coupon.maxDiscountAmount) {
                discountAmount = coupon.maxDiscountAmount;
            }
        }
        else {
            discountAmount = coupon.discount;
        }
        return {
            couponId: coupon._id,
            couponCode: coupon.couponCode,
            applicableOn: coupon.applicableOn,
            discountType: coupon.discountType,
            discount: coupon.discount,
            discountAmount,
            finalAmount: Math.max(0, orderAmount - discountAmount),
        };
    }
}
//# sourceMappingURL=coupon.service.js.map