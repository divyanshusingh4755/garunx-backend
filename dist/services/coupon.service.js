import { Types } from "mongoose";
import { Coupon } from "../models/coupon.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
export class CouponService {
    static ensureValidId(id) {
        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid coupon ID");
        }
    }
    static async createCoupon(couponData) {
        if (!couponData.couponCode?.trim()) {
            throw new Error("Coupon code is required");
        }
        const normalizedCode = couponData.couponCode.trim().toUpperCase();
        const existingCoupon = await Coupon.findOne({
            couponCode: normalizedCode,
        }).lean();
        if (existingCoupon) {
            throw new Error(`Coupon code '${normalizedCode}' already exists`);
        }
        const coupon = new Coupon({
            ...couponData,
            couponCode: normalizedCode,
        });
        return coupon.save();
    }
    static async updateCoupon(id, updateData) {
        this.ensureValidId(id);
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            throw new Error("Coupon not found");
        }
        if (updateData.couponCode !== undefined) {
            const normalizedCode = updateData.couponCode.trim().toUpperCase();
            const duplicate = await Coupon.exists({
                couponCode: normalizedCode,
                _id: {
                    $ne: coupon._id,
                },
            });
            if (duplicate) {
                throw new Error(`Coupon code '${normalizedCode}' already exists`);
            }
            coupon.couponCode = normalizedCode;
        }
        const protectedFields = new Set([
            "_id",
            "__v",
            "version",
            "createdAt",
            "updatedAt",
            "usedCount",
            "couponCode",
        ]);
        for (const [field, value] of Object.entries(updateData)) {
            if (protectedFields.has(field)) {
                continue;
            }
            coupon.set(field, value);
        }
        /*
         * Normalize arrays according to the final applicable type.
         * This handles changing from SERVICE to PACKAGE and vice versa.
         */
        if (coupon.applicableOn === "SERVICE") {
            coupon.packages = [];
            if (!coupon.services || coupon.services.length === 0) {
                throw new Error("At least one service is required for SERVICE coupons");
            }
        }
        if (coupon.applicableOn === "PACKAGE") {
            coupon.services = [];
            if (!coupon.packages || coupon.packages.length === 0) {
                throw new Error("At least one package is required for PACKAGE coupons");
            }
        }
        if (coupon.applicableOn === "ALL" || coupon.applicableOn === "REFERRAL") {
            coupon.services = [];
            coupon.packages = [];
        }
        if (coupon.applicableOn === "REFERRAL" && !coupon.assignedUserId) {
            throw new Error("assignedUserId is required for REFERRAL coupons");
        }
        await coupon.save();
        // Return the same populated structure as GET APIs.
        await coupon.populate([
            {
                path: "services",
                select: "name",
            },
            {
                path: "packages",
                select: "name",
            },
        ]);
        return coupon;
    }
    static async getCouponById(id) {
        this.ensureValidId(id);
        const coupon = await Coupon.findById(id)
            .populate({
            path: "services",
            select: "_id name",
        })
            .populate({
            path: "packages",
            select: "_id name",
        });
        if (!coupon) {
            throw new Error("Coupon not found");
        }
        return coupon;
    }
    static async deleteCoupon(id) {
        this.ensureValidId(id);
        const coupon = await Coupon.findByIdAndDelete(id);
        if (!coupon) {
            throw new Error("Coupon not found");
        }
        return coupon;
    }
    static async toggleCouponStatus(id) {
        this.ensureValidId(id);
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            throw new Error("Coupon not found");
        }
        coupon.isActive = !coupon.isActive;
        return coupon.save();
    }
    static async findCoupons(searchTerm, limit = 20, page = 1, isActive, assignedUserId, applicableOn, sortBy = "createdAt", sortOrder = "desc") {
        const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const skip = safeLimit * (safePage - 1);
        const conditions = [];
        if (typeof isActive === "boolean") {
            conditions.push({ isActive });
        }
        if (applicableOn) {
            const values = (Array.isArray(applicableOn) ? applicableOn : applicableOn.split(","))
                .map((item) => item.trim().toUpperCase())
                .filter(Boolean);
            if (assignedUserId) {
                conditions.push({
                    $or: values.map((value) => value === "REFERRAL"
                        ? {
                            applicableOn: "REFERRAL",
                            assignedUserId,
                        }
                        : {
                            applicableOn: value,
                        }),
                });
            }
            else {
                conditions.push({
                    applicableOn: {
                        $in: values,
                    },
                });
            }
        }
        else if (assignedUserId) {
            conditions.push({
                assignedUserId,
            });
        }
        const normalizedSearch = searchTerm?.trim();
        const isTextSearch = Boolean(normalizedSearch && normalizedSearch.length > 4);
        if (normalizedSearch) {
            if (isTextSearch) {
                conditions.push({
                    $text: {
                        $search: normalizedSearch,
                    },
                });
            }
            else {
                conditions.push({
                    $or: [
                        {
                            name: {
                                $regex: `^${escapeRegex(normalizedSearch)}`,
                                $options: "i",
                            },
                        },
                        {
                            couponCode: {
                                $regex: `^${escapeRegex(normalizedSearch.toUpperCase())}`,
                            },
                        },
                    ],
                });
            }
        }
        const query = conditions.length > 0 ? { $and: conditions } : {};
        const allowedSortFields = new Set([
            "createdAt",
            "updatedAt",
            "name",
            "couponCode",
            "applicableOn",
            "discount",
            "usageLimit",
            "usedCount",
            "validFrom",
            "validTill",
            "isActive",
            "relevance",
        ]);
        const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "createdAt";
        let projection = {};
        let sortCriteria;
        if (isTextSearch && safeSortBy === "relevance") {
            projection = {
                score: {
                    $meta: "textScore",
                },
            };
            sortCriteria = {
                score: {
                    $meta: "textScore",
                },
            };
        }
        else {
            const actualSortField = safeSortBy === "relevance" ? "createdAt" : safeSortBy;
            sortCriteria = {
                [actualSortField]: sortOrder === "desc" ? -1 : 1,
            };
            if (actualSortField !== "createdAt") {
                sortCriteria.createdAt = -1;
            }
        }
        try {
            const [data, total] = await Promise.all([
                Coupon.find(query, projection)
                    .populate("services", "name")
                    .populate("packages", "name")
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(safeLimit)
                    .lean(),
                Coupon.countDocuments(query),
            ]);
            return {
                data,
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit),
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            throw new Error(`Coupon fetch failed: ${message}`);
        }
    }
    static async validateCoupon({ couponCode, serviceId, packageId, orderAmount, userId, isFirstOrder = false, }) {
        if (!Number.isFinite(orderAmount) || orderAmount < 0) {
            throw new Error("Order amount must be a non-negative number");
        }
        const normalizedCode = couponCode.trim().toUpperCase();
        const coupon = await Coupon.findOne({
            couponCode: normalizedCode,
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
        if (coupon.assignedUserId) {
            if (!userId) {
                throw new Error("User authentication is required for this coupon");
            }
            if (coupon.assignedUserId.toString() !== userId) {
                throw new Error("This coupon does not belong to you");
            }
        }
        switch (coupon.applicableOn) {
            case "SERVICE": {
                if (!serviceId) {
                    throw new Error("This coupon is applicable only for services");
                }
                const isApplicable = coupon.services.some((item) => item.toString() === serviceId);
                if (!isApplicable) {
                    throw new Error("Coupon is not applicable for this service");
                }
                break;
            }
            case "PACKAGE": {
                if (!packageId) {
                    throw new Error("This coupon is applicable only for packages");
                }
                const isApplicable = coupon.packages.some((item) => item.toString() === packageId);
                if (!isApplicable) {
                    throw new Error("Coupon is not applicable for this package");
                }
                break;
            }
            case "ALL":
            case "REFERRAL":
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
        let discountAmount;
        if (coupon.discountType === "PERCENTAGE") {
            discountAmount = (orderAmount * coupon.discount) / 100;
            if (coupon.maxDiscountAmount !== undefined) {
                discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
            }
        }
        else {
            discountAmount = coupon.discount;
        }
        discountAmount = Math.min(discountAmount, orderAmount);
        return {
            couponId: coupon._id,
            couponCode: coupon.couponCode,
            applicableOn: coupon.applicableOn,
            discountType: coupon.discountType,
            discount: coupon.discount,
            discountAmount,
            finalAmount: orderAmount - discountAmount,
        };
    }
}
//# sourceMappingURL=coupon.service.js.map