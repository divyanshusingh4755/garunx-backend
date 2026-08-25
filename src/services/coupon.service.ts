import { Types } from "mongoose";
import { Coupon, type ICoupon } from "../models/coupon.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { NotificationService } from "./notification.service.js";
import { User } from "../models/user.model.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";
import { Service } from "../models/service.model.js";
import { Package } from "../models/package.model.js";
import { Booking } from "../models/booking.model.js";

type ApplicableOn = "ALL" | "SERVICE" | "PACKAGE" | "REFERRAL";

type CouponUpdateData = Partial<
  Pick<ICoupon, | "name" | "couponCode" | "applicableOn" | "services" | "packages" | "assignedUserId" | "discount" | "discountType" | "usageLimit" | "validFrom" | "validTill" | "minOrderAmount" | "maxDiscountAmount" | "isFirstOrderOnly">
>;

interface GetAvailableCouponsInput {
  userId: string;
  serviceId?: string;
  packageId?: string;
  orderAmount?: number;
}

interface ValidateCouponInput {
  couponCode: string;
  serviceId?: string;
  packageId?: string;
  orderAmount: number;
  userId?: string;
}

type SortSpecification = Record<string, 1 | -1 | { $meta: "textScore" }>;
type ProjectionSpecification = Record<string, 0 | 1 | { $meta: "textScore" }>;

export class CouponService {
  private static async validateCouponReferences(coupon: { applicableOn: ApplicableOn; services?: readonly Types.ObjectId[]; packages?: readonly Types.ObjectId[]; assignedUserId?: Types.ObjectId | null; }): Promise<void> {
    if (coupon.applicableOn === "SERVICE") {
      const serviceIds = [...new Set((coupon.services ?? []).map((id) => id.toString()))];
      if (serviceIds.length === 0) { throw new Error("At least one service is required for SERVICE coupons"); }

      const existingServiceCount = await Service.countDocuments({ _id: { $in: serviceIds.map((id) => new Types.ObjectId(id)) } });
      if (existingServiceCount !== serviceIds.length) {
        throw new Error("One or more selected services do not exist");
      }
    }

    if (coupon.applicableOn === "PACKAGE") {
      const packageIds = [...new Set((coupon.packages ?? []).map((id) => id.toString()))];
      if (packageIds.length === 0) {
        throw new Error("At least one package is required for PACKAGE coupons");
      }

      const existingPackageCount = await Package.countDocuments({ _id: { $in: packageIds.map((id) => new Types.ObjectId(id)) } });

      if (existingPackageCount !== packageIds.length) { throw new Error("One or more selected packages do not exist"); }
    }

    if (coupon.applicableOn === "REFERRAL") {
      if (!coupon.assignedUserId) { throw new Error("assignedUserId is required for REFERRAL coupons"); }

      const assignedUser = await User.exists({ _id: coupon.assignedUserId, role: "USER" });
      if (!assignedUser) { throw new Error("Assigned user not found"); }
    }
  }

  private static async isUserFirstOrder(userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) { throw new Error("Invalid user ID"); }

    // A user is considered a first-order user only when they have never successfully paid for a previous booking. Pending / failed / expired payment attempts do not disqualify the user.    
    const previousPaidBooking = await Booking.exists({ userId: new Types.ObjectId(userId), isDeleted: { $ne: true }, "payment.status": "PAID" });
    return !previousPaidBooking;
  }

  private static async invalidateCouponCache(couponId?: string): Promise<void> {
    const operations: Promise<unknown>[] = [RedisCacheService.deleteByPattern(CacheKeys.couponListPattern())];
    if (couponId) {
      operations.push(RedisCacheService.delete(CacheKeys.couponDetail(couponId)),
      );
    }

    await Promise.all(operations);
  }

  private static async notifyReferralCouponAssignment(params: { couponId: string; assignedUserId: string; couponCode: string; couponName: string; discount: number; discountType: "PERCENTAGE" | "FIXED"; validTill?: Date; dedupeKey: string; }): Promise<void> {
    try {
      const recipient = await User.findById(params.assignedUserId).select("_id role email");
      if (!recipient) {
        console.error(`[COUPON NOTIFICATION] Assigned user ${params.assignedUserId} not found`);
        return;
      }

      const discountText = params.discountType === "PERCENTAGE" ? `${params.discount}%` : `₹${params.discount}`;
      const validityText = params.validTill ? params.validTill.toISOString() : "No expiry date";

      await NotificationService.createFromTemplate({
        recipientId: recipient._id,
        recipientRole: recipient.role,
        templateCode: "REFERRAL_COUPON_ASSIGNED",
        variables: { couponCode: params.couponCode, couponName: params.couponName, discountText, validityText },
        referenceId: params.couponId,
        dedupeKey: params.dedupeKey,
        channels: { email: Boolean(recipient.email), push: true },
      });
    } catch (error) {
      console.error(`[COUPON NOTIFICATION] Failed to send referral coupon notification for ${params.couponCode}:`, error);
    }
  }

  private static ensureValidId(id: string): void { if (!Types.ObjectId.isValid(id)) { throw new Error("Invalid coupon ID"); } }

  static async createCoupon(couponData: CouponUpdateData) {
    if (!couponData.couponCode?.trim()) { throw new Error("Coupon code is required"); }

    const normalizedCode = couponData.couponCode.trim().toUpperCase();

    const existingCoupon = await Coupon.findOne({ couponCode: normalizedCode }).lean();
    if (existingCoupon) { throw new Error(`Coupon code '${normalizedCode}' already exists`); }

    const coupon = new Coupon({ ...couponData, couponCode: normalizedCode });

    await this.validateCouponReferences({ applicableOn: coupon.applicableOn, services: coupon.services, packages: coupon.packages, assignedUserId: coupon.assignedUserId ?? null });
    await coupon.save();

    if (coupon.applicableOn === "REFERRAL" && coupon.assignedUserId) {
      await this.notifyReferralCouponAssignment({
        couponId: coupon._id.toString(),
        assignedUserId: coupon.assignedUserId.toString(),
        couponCode: coupon.couponCode,
        couponName: coupon.name,
        discount: coupon.discount,
        discountType: coupon.discountType,
        ...(coupon.validTill && { validTill: coupon.validTill }),
        dedupeKey: `COUPON:REFERRAL_ASSIGNED:${coupon._id}:${coupon.assignedUserId}:${coupon.updatedAt.getTime()}`,
      });
    }

    await this.invalidateCouponCache();
    return coupon;
  }

  static async updateCoupon(id: string, updateData: CouponUpdateData) {
    this.ensureValidId(id);

    const coupon = await Coupon.findById(id);
    if (!coupon) { throw new Error("Coupon not found"); }

    const previousApplicableOn = coupon.applicableOn;
    const previousAssignedUserId = coupon.assignedUserId?.toString();

    if (updateData.couponCode !== undefined) {
      const normalizedCode = updateData.couponCode.trim().toUpperCase();

      const duplicate = await Coupon.exists({ couponCode: normalizedCode, _id: { $ne: coupon._id } });
      if (duplicate) { throw new Error(`Coupon code '${normalizedCode}' already exists`); }

      coupon.couponCode = normalizedCode;
    }

    const protectedFields = new Set(["_id", "__v", "version", "createdAt", "updatedAt", "usedCount", "couponCode"]);

    for (const [field, value] of Object.entries(updateData)) {
      if (protectedFields.has(field)) { continue; }
      coupon.set(field, value);
    }

    // Normalize arrays according to the final applicable type. This handles changing from SERVICE to PACKAGE and vice versa.
    if (coupon.applicableOn === "SERVICE") {
      coupon.packages = [];

      if (!coupon.services || coupon.services.length === 0) { throw new Error("At least one service is required for SERVICE coupons"); }
    }

    if (coupon.applicableOn === "PACKAGE") {
      coupon.services = [];
      if (!coupon.packages || coupon.packages.length === 0) { throw new Error("At least one package is required for PACKAGE coupons"); }
    }

    if (coupon.applicableOn === "ALL" || coupon.applicableOn === "REFERRAL") { coupon.services = []; coupon.packages = []; }
    if (coupon.applicableOn === "REFERRAL" && !coupon.assignedUserId) { throw new Error("assignedUserId is required for REFERRAL coupons"); }

    await this.validateCouponReferences({ applicableOn: coupon.applicableOn, services: coupon.services, packages: coupon.packages, assignedUserId: coupon.assignedUserId ?? null });
    await coupon.save();

    const currentAssignedUserId = coupon.assignedUserId?.toString();
    const becameReferralCoupon = previousApplicableOn !== "REFERRAL" && coupon.applicableOn === "REFERRAL";
    const assignedUserChanged = currentAssignedUserId !== undefined && currentAssignedUserId !== previousAssignedUserId;

    if (coupon.applicableOn === "REFERRAL" && currentAssignedUserId && (becameReferralCoupon || assignedUserChanged)) {
      await this.notifyReferralCouponAssignment({
        couponId: coupon._id.toString(),
        assignedUserId: currentAssignedUserId,
        couponCode: coupon.couponCode,
        couponName: coupon.name,
        discount: coupon.discount,
        discountType: coupon.discountType,
        ...(coupon.validTill && { validTill: coupon.validTill }),
        dedupeKey: `COUPON:REFERRAL_ASSIGNED:${coupon._id}:${currentAssignedUserId}:${coupon.updatedAt.getTime()}`,
      });
    }

    // Return the same populated structure as GET APIs.
    await coupon.populate([{ path: "services", select: "name" }, { path: "packages", select: "name" }]);
    await this.invalidateCouponCache(id);

    return coupon;
  }

  static async findCoupons(searchTerm?: string, limit = 20, page = 1, isActive?: boolean, assignedUserId?: string, applicableOn?: string | string[], sortBy = "createdAt", sortOrder: "asc" | "desc" = "desc") {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;

    if (assignedUserId && !Types.ObjectId.isValid(assignedUserId)) { throw new Error("Invalid assigned user ID"); }
    const normalizedSearch = searchTerm?.trim();
    const isTextSearch = Boolean(normalizedSearch && normalizedSearch.length > 4);

    const allowedSortFields = new Set(["createdAt", "updatedAt", "name", "couponCode", "applicableOn", "discount", "usageLimit", "usedCount", "validFrom", "validTill", "isActive", "relevance"]);
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "createdAt";
    const effectiveSortBy = safeSortBy === "relevance" && !isTextSearch ? "createdAt" : safeSortBy;

    const cacheKey = CacheKeys.couponList({ searchTerm: normalizedSearch, assignedUserId, applicableOn, limit: safeLimit, page: safePage, isActive, sortBy: effectiveSortBy, sortOrder });

    return RedisCacheService.getOrSet({
      key: cacheKey,
      ttlSeconds: CACHE_TTL_SECONDS.COUPON_LIST,
      loader: async () => {
        const skip = safeLimit * (safePage - 1);
        const conditions: Record<string, unknown>[] = [];

        if (typeof isActive === "boolean") { conditions.push({ isActive }); }

        if (applicableOn) {
          const values = (Array.isArray(applicableOn) ? applicableOn : applicableOn.split(",")).map((item) => item.trim().toUpperCase()).filter(Boolean) as ApplicableOn[];

          if (assignedUserId) {
            conditions.push({ $or: values.map((value) => value === "REFERRAL" ? { applicableOn: "REFERRAL", assignedUserId: new Types.ObjectId(assignedUserId) } : { applicableOn: value }) });
          } else {
            conditions.push({ applicableOn: { $in: values } });
          }
        } else if (assignedUserId) {
          conditions.push({ assignedUserId: new Types.ObjectId(assignedUserId) });
        }

        if (normalizedSearch) {
          if (isTextSearch) {
            conditions.push({ $text: { $search: normalizedSearch } });
          } else {
            conditions.push({
              $or: [
                { name: { $regex: `^${escapeRegex(normalizedSearch)}`, $options: "i" } },
                { couponCode: { $regex: `^${escapeRegex(normalizedSearch.toUpperCase())}` } },
              ],
            });
          }
        }

        const query = conditions.length > 0 ? { $and: conditions } : {};
        let projection: ProjectionSpecification = {};
        let sortCriteria: SortSpecification;

        if (isTextSearch && effectiveSortBy === "relevance") {
          projection = { score: { $meta: "textScore" } };
          sortCriteria = { score: { $meta: "textScore" } };
        } else {
          sortCriteria = { [effectiveSortBy]: sortOrder === "desc" ? -1 : 1 };
          if (effectiveSortBy !== "createdAt") { sortCriteria.createdAt = -1; }
        }

        try {
          const [data, total] = await Promise.all([
            Coupon.find(query, projection).populate("services", "name").populate("packages", "name").sort(sortCriteria).skip(skip).limit(safeLimit).lean(),
            Coupon.countDocuments(query),
          ]);

          return {
            data, total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit),
          };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          throw new Error(`Coupon fetch failed: ${message}`);
        }
      },
    });
  }

  static async deleteCoupon(id: string) {
    this.ensureValidId(id);
    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) { throw new Error("Coupon not found"); }
    await this.invalidateCouponCache(id);
    return coupon;
  }

  static async toggleCouponStatus(id: string) {
    this.ensureValidId(id);

    const coupon = await Coupon.findById(id);
    if (!coupon) { throw new Error("Coupon not found"); }

    coupon.isActive = !coupon.isActive;
    const updatedCoupon = await coupon.save();
    await this.invalidateCouponCache(id);
    return updatedCoupon;
  }

  static async getCouponById(id: string) {
    this.ensureValidId(id);

    return RedisCacheService.getOrSet({
      key: CacheKeys.couponDetail(id),
      ttlSeconds: CACHE_TTL_SECONDS.COUPON_DETAIL,

      loader: async () => {
        const coupon = await Coupon.findById(id).populate({ path: "services", select: "_id name" }).populate({ path: "packages", select: "_id name" }).lean();
        if (!coupon) { throw new Error("Coupon not found"); }
        return coupon;
      },
    });
  }

  static async validateCoupon({ couponCode, serviceId, packageId, orderAmount, userId }: ValidateCouponInput) {
    if (!Number.isFinite(orderAmount) || orderAmount < 0) { throw new Error("Order amount must be a non-negative number"); }

    const normalizedCode = couponCode.trim().toUpperCase();
    const coupon = await Coupon.findOne({ couponCode: normalizedCode, isActive: true });
    if (!coupon) { throw new Error("Invalid coupon code"); }

    const now = new Date();
    if (coupon.validFrom && coupon.validFrom > now) { throw new Error("Coupon is not active yet"); }
    if (coupon.validTill && coupon.validTill < now) { throw new Error("Coupon has expired"); }
    if (coupon.assignedUserId) {
      if (!userId) { throw new Error("User authentication is required for this coupon"); }
      if (coupon.assignedUserId.toString() !== userId) { throw new Error("This coupon does not belong to you"); }
    }

    switch (coupon.applicableOn) {
      case "SERVICE": {
        if (!serviceId) { throw new Error("This coupon is applicable only for services"); }
        const isApplicable = coupon.services.some((item) => item.toString() === serviceId);
        if (!isApplicable) { throw new Error("Coupon is not applicable for this service"); }
        break;
      }

      case "PACKAGE": {
        if (!packageId) { throw new Error("This coupon is applicable only for packages"); }
        const isApplicable = coupon.packages.some((item) => item.toString() === packageId);
        if (!isApplicable) { throw new Error("Coupon is not applicable for this package"); }
        break;
      }

      case "ALL":
      case "REFERRAL":
        break;
    }

    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) { throw new Error("Coupon usage limit reached"); }
    if (orderAmount < coupon.minOrderAmount) { throw new Error(`Minimum order amount is ₹${coupon.minOrderAmount}`); }
    if (coupon.isFirstOrderOnly) {
      if (!userId) {
        throw new Error("User authentication is required for first-order coupon");
      }

      const isFirstOrder = await this.isUserFirstOrder(userId);
      if (!isFirstOrder) { throw new Error("Coupon is valid only for first order"); }
    }

    let discountAmount: number;
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (orderAmount * coupon.discount) / 100;

      if (coupon.maxDiscountAmount !== undefined) { discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount); }
    } else { discountAmount = coupon.discount; }

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

  static async getAvailableCoupons({ userId, serviceId, packageId, orderAmount }: GetAvailableCouponsInput) {
    if (!Types.ObjectId.isValid(userId)) { throw new Error("Invalid user ID"); }

    const isFirstOrder = await this.isUserFirstOrder(userId);
    const now = new Date();
    const conditions: Record<string, unknown>[] = [
      { isActive: true },
      { $or: [{ validFrom: { $exists: false } }, { validFrom: null }, { validFrom: { $lte: now } }] },
      { $or: [{ validTill: { $exists: false } }, { validTill: null }, { validTill: { $gte: now } }] },
      { $or: [{ assignedUserId: { $exists: false } }, { assignedUserId: null }, { assignedUserId: new Types.ObjectId(userId) }] },
      { $expr: { $or: [{ $eq: ["$usageLimit", 0] }, { $lt: ["$usedCount", "$usageLimit"] }] } },
    ];

    if (isFirstOrder === false) {
      conditions.push({ $or: [{ isFirstOrderOnly: false }, { isFirstOrderOnly: { $exists: false } }] });
    }

    if (typeof orderAmount === "number" && Number.isFinite(orderAmount)) {
      conditions.push({ minOrderAmount: { $lte: orderAmount } });
    }

    if (serviceId) {
      if (!Types.ObjectId.isValid(serviceId)) { throw new Error("Invalid service ID"); }
      conditions.push({ $or: [{ applicableOn: "ALL" }, { applicableOn: "SERVICE", services: new Types.ObjectId(serviceId) }, { applicableOn: "REFERRAL", assignedUserId: new Types.ObjectId(userId) }] });
    } else if (packageId) {
      if (!Types.ObjectId.isValid(packageId)) { throw new Error("Invalid package ID"); }
      conditions.push({ $or: [{ applicableOn: "ALL" }, { applicableOn: "PACKAGE", packages: new Types.ObjectId(packageId) }, { applicableOn: "REFERRAL", assignedUserId: new Types.ObjectId(userId) }] });
    } else {
      conditions.push({ $or: [{ applicableOn: "ALL" }, { applicableOn: "REFERRAL", assignedUserId: new Types.ObjectId(userId) }, { applicableOn: "SERVICE" }, { applicableOn: "PACKAGE" }] });
    }

    const coupons = await Coupon.find({ $and: conditions }).select(["name", "couponCode", "applicableOn", "services", "packages", "discount", "discountType", "validFrom", "validTill", "minOrderAmount", "maxDiscountAmount", "isFirstOrderOnly"].join(" ")).populate("services", "_id name").populate("packages", "_id name").sort({ createdAt: -1 }).lean();
    return coupons;
  }

  static async exportCouponsToCsv(couponIds: string[]) {
    const uniqueCouponIds = [...new Set(couponIds.map((id) => id.toString()))];
    const coupons = await Coupon.find({ _id: { $in: uniqueCouponIds } })
      .select(["name", "couponCode", "applicableOn", "services", "packages", "assignedUserId", "discount", "discountType", "usageLimit", "usedCount", "validFrom", "validTill", "minOrderAmount", "maxDiscountAmount", "isFirstOrderOnly", "isActive", "createdAt", "updatedAt"].join(" "))
      .populate("services", "name")
      .populate("packages", "name")
      .populate("assignedUserId", "userReference fullName email phoneNumber")
      .lean();

    if (coupons.length === 0) { throw new Error("No coupons found for export"); }

    const escapeCsv = (value: unknown): string => {
      if (value === null || value === undefined) { return ""; }

      // Prevent spreadsheet formula injection. CSV files are commonly opened in Excel / Google Sheets. Values beginning with these characters can otherwise be interpreted as formulas.
      let stringValue = String(value);

      if (/^[=+\-@]/.test(stringValue)) { stringValue = `'${stringValue}`; }
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n") || stringValue.includes("\r")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    };

    const headers = [
      "Coupon Name",
      "Coupon Code",
      "Applicable On",
      "Services",
      "Packages",
      "Assigned User Reference",
      "Assigned User Name",
      "Assigned User Email",
      "Assigned User Phone",
      "Discount",
      "Discount Type",
      "Usage Limit",
      "Used Count",
      "Remaining Uses",
      "Valid From",
      "Valid Till",
      "Minimum Order Amount",
      "Maximum Discount Amount",
      "First Order Only",
      "Active",
      "Created At",
      "Updated At",
    ];

    const rows =
      coupons.map((coupon) => {
        const services = Array.isArray(coupon.services) ? coupon.services.map((service) => {
          const populatedService = service as unknown as { name?: string; };
          return (populatedService.name ?? "");
        }).filter(Boolean).join(" | ") : "";

        const packages = Array.isArray(coupon.packages) ? coupon.packages.map((pkg) => {
          const populatedPackage = pkg as unknown as { name?: string; };
          return (populatedPackage.name ?? "");
        }).filter(Boolean).join(" | ") : "";

        const assignedUser = coupon.assignedUserId as unknown as | {
          userReference?: string; fullName?: string; email?: string; phoneNumber?: string;
        } | null | undefined;

        const remainingUses = coupon.usageLimit === 0 ? "Unlimited" : Math.max(coupon.usageLimit - coupon.usedCount, 0);

        return [
          coupon.name,
          coupon.couponCode,
          coupon.applicableOn,
          services,
          packages,
          assignedUser?.userReference,
          assignedUser?.fullName,
          assignedUser?.email,
          assignedUser?.phoneNumber,
          coupon.discount,
          coupon.discountType,
          coupon.usageLimit === 0 ? "Unlimited" : coupon.usageLimit,
          coupon.usedCount,
          remainingUses,
          coupon.validFrom ? new Date(coupon.validFrom).toISOString() : "",
          coupon.validTill ? new Date(coupon.validTill).toISOString() : "",
          coupon.minOrderAmount,
          coupon.maxDiscountAmount ?? "",
          coupon.isFirstOrderOnly ? "Yes" : "No",
          coupon.isActive ? "Yes" : "No",
          coupon.createdAt ? new Date(coupon.createdAt).toISOString() : "",
          coupon.updatedAt ? new Date(coupon.updatedAt).toISOString() : "",
        ];
      });

    const csv = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");

    // UTF-8 BOM helps Excel correctly detect UTF-8 values such as ₹ and non-English names.
    return { csv: `\uFEFF${csv}`, total: coupons.length };
  }
}