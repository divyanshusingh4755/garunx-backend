import mongoose, { Types } from "mongoose";
import { Component } from "../models/component.model.js";
import { Category } from "../models/category.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";
const createHttpError = (message, statusCode) => { const error = new Error(message); error.statusCode = statusCode; return error; };
export class ComponentService {
    static async invalidateComponentCache(componentId) {
        const operations = [RedisCacheService.deleteByPattern(CacheKeys.componentListPattern())];
        if (componentId) {
            operations.push(RedisCacheService.delete(CacheKeys.componentDetail(componentId)));
        }
        await Promise.all(operations);
    }
    static async invalidateAffectedServiceCaches(componentId) {
        const affectedMappings = await ServiceComponent.find({ componentId: new Types.ObjectId(componentId) }).select("serviceId").lean();
        const serviceIds = [...new Set(affectedMappings.map((mapping) => mapping.serviceId.toString()))];
        const operations = [
            // Component changes may affect any cached ServiceComponent response.
            RedisCacheService.deleteByPattern(CacheKeys.serviceComponentPattern()),
            // Service lists may contain populated or derived component information.
            RedisCacheService.deleteByPattern(CacheKeys.serviceListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.serviceByLocationListPattern()),
        ];
        for (const serviceId of serviceIds) {
            operations.push(
            // Standard service detail.
            RedisCacheService.delete(CacheKeys.serviceDetail(serviceId)), 
            // Full aggregate service response.
            RedisCacheService.delete(CacheKeys.serviceFull(serviceId)), 
            // City-specific full service responses.
            RedisCacheService.deleteByPattern(CacheKeys.serviceFullByCitiesPattern(serviceId)), 
            // Component status changes can deactivate pricing records.
            RedisCacheService.deleteByPattern(CacheKeys.serviceResolvedPricingByServicePattern(serviceId)));
        }
        await Promise.all(operations);
    }
    static async createComponent(payload) {
        const categoryExists = await Category.exists({ _id: payload.categoryId });
        if (!categoryExists) {
            throw createHttpError("Category not found", 404);
        }
        try {
            const component = await Component.create(payload);
            await this.invalidateComponentCache();
            return component;
        }
        catch (error) {
            if (error?.code === 11000) {
                throw createHttpError("Component already exists", 409);
            }
            throw error;
        }
    }
    static async updateComponent(componentId, updateData) {
        if (updateData.categoryId !== undefined) {
            const categoryExists = await Category.exists({ _id: updateData.categoryId });
            if (!categoryExists) {
                throw createHttpError("Category not found", 404);
            }
        }
        try {
            const component = await Component.findByIdAndUpdate(componentId, { $set: updateData }, { new: true, runValidators: true }).lean();
            if (!component) {
                throw createHttpError("Component not found", 404);
            }
            await Promise.all([
                this.invalidateComponentCache(componentId),
                this.invalidateAffectedServiceCaches(componentId),
            ]);
            return component;
        }
        catch (error) {
            if (error?.code === 11000) {
                throw createHttpError("Component already exists", 409);
            }
            throw error;
        }
    }
    static async getDeactivationImpact(componentId) {
        const targetId = new Types.ObjectId(componentId);
        const [serviceComponents, pricing] = await Promise.all([
            ServiceComponent.find({ componentId: targetId }, { _id: 1, serviceId: 1 }).lean(),
            ServicePricing.find({ componentId: targetId, isActive: true }, { _id: 1 }).lean(),
        ]);
        return {
            affectedServicesCount: serviceComponents.length,
            pricingCount: pricing.length,
            serviceComponents,
        };
    }
    static async toggleComponentStatus(componentId, isActive, confirmed = false) {
        const component = await Component.findById(componentId).select("_id isActive").lean();
        if (!component) {
            throw createHttpError("Component not found", 404);
        }
        if (component.isActive === isActive) {
            return { success: true, unchanged: true, component };
        }
        if (!isActive && !confirmed) {
            const impact = await this.getDeactivationImpact(componentId);
            if (impact.affectedServicesCount > 0 || impact.pricingCount > 0) {
                return { requiresConfirmation: true, impact };
            }
        }
        const session = await mongoose.startSession();
        try {
            session.startTransaction();
            const updatedComponent = await Component.findByIdAndUpdate(componentId, { $set: { isActive } }, { new: true, session }).lean();
            if (!updatedComponent) {
                throw createHttpError("Component not found", 404);
            }
            if (!isActive) {
                await ServicePricing.updateMany({ componentId: new Types.ObjectId(componentId), isActive: true }, { $set: { isActive: false } }, { session });
            }
            await session.commitTransaction();
            await Promise.all([
                this.invalidateComponentCache(componentId),
                this.invalidateAffectedServiceCaches(componentId),
            ]);
            return { success: true, component: updatedComponent };
        }
        catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    static async getComponentById(componentId) {
        return RedisCacheService.getOrSet({
            key: CacheKeys.componentDetail(componentId),
            ttlSeconds: CACHE_TTL_SECONDS.COMPONENT_DETAIL,
            loader: async () => {
                const component = await Component.findById(componentId).lean();
                if (!component) {
                    throw createHttpError("Component not found", 404);
                }
                return component;
            },
        });
    }
    static async findComponents(params) {
        const { searchTerm, categoryId, limit = 20, page = 1, isRemovable, isActive, isBundled, sortBy = "createdAt", sortOrder = "desc" } = params;
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        if (categoryId && !Types.ObjectId.isValid(categoryId)) {
            throw createHttpError("Invalid categoryId", 400);
        }
        const term = searchTerm?.trim();
        const isTextSearch = Boolean(term && term.length > 4);
        const allowedSortFields = new Set(["name", "createdAt", "updatedAt", "isActive", "isRemovable", "isBundled"]);
        const safeSortBy = isTextSearch && sortBy === "relevance" ? "relevance" : allowedSortFields.has(sortBy) ? sortBy : "createdAt";
        const cacheKey = CacheKeys.componentList({ searchTerm: term, categoryId, limit: safeLimit, page: safePage, isRemovable, isActive, isBundled, sortBy: safeSortBy, sortOrder });
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS.COMPONENT_LIST,
            loader: async () => {
                const skip = (safePage - 1) * safeLimit;
                const query = {};
                if (typeof isActive === "boolean") {
                    query.isActive = isActive;
                }
                if (typeof isRemovable === "boolean") {
                    query.isRemovable = isRemovable;
                }
                if (typeof isBundled === "boolean") {
                    query.isBundled = isBundled;
                }
                if (categoryId) {
                    query.categoryId = new Types.ObjectId(categoryId);
                }
                if (term) {
                    if (isTextSearch) {
                        query.$text = { $search: term };
                    }
                    else {
                        query.name = { $regex: `^${escapeRegex(term)}`, $options: "i" };
                    }
                }
                let projection;
                let sortCriteria;
                if (isTextSearch && safeSortBy === "relevance") {
                    projection = { score: { $meta: "textScore" } };
                    sortCriteria = { score: { $meta: "textScore" } };
                }
                else {
                    sortCriteria = { [safeSortBy]: sortOrder === "asc" ? 1 : -1 };
                    if (safeSortBy !== "createdAt") {
                        sortCriteria.createdAt = -1;
                    }
                }
                const [components, total] = await Promise.all([
                    Component.find(query, projection).sort(sortCriteria).skip(skip).limit(safeLimit).lean(),
                    Component.countDocuments(query),
                ]);
                return {
                    data: components, total, page: safePage, totalPages: Math.ceil(total / safeLimit),
                };
            },
        });
    }
    static async exportComponentsToCsv(componentIds) {
        const uniqueComponentIds = [...new Set(componentIds)];
        // Defensive validation. Route validation already checks this, but the service should remain safe when called from elsewhere.
        if (uniqueComponentIds.some((id) => !Types.ObjectId.isValid(id))) {
            throw createHttpError("One or more component IDs are invalid", 400);
        }
        const components = await Component.find({ _id: { $in: uniqueComponentIds.map((id) => new Types.ObjectId(id)) } }).select(["name", "categoryId", "description", "imageUrl", "isRemovable", "isBundled", "isActive", "createdAt", "updatedAt"].join(" ")).populate("categoryId", "label value").lean();
        if (components.length === 0) {
            throw createHttpError("No components found for export", 404);
        }
        const escapeCsv = (value) => {
            if (value === null || value === undefined) {
                return "";
            }
            let stringValue = String(value);
            // Prevent spreadsheet formula interpretation when CSV is opened in Excel/Sheets.
            if (/^[=+\-@]/.test(stringValue)) {
                stringValue = `'${stringValue}`;
            }
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n") || stringValue.includes("\r")) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };
        const headers = ["Component ID", "Name", "Category ID", "Category Label", "Category Value", "Description", "Image URL", "Removable", "Bundled", "Active", "Created At", "Updated At"];
        const rows = components.map((component) => [component._id, component.name, component.categoryId?._id ?? "", component.categoryId?.label ?? "", component.categoryId?.value ?? "", component.description, component.imageUrl, component.isRemovable, component.isBundled, component.isActive, component.createdAt ? new Date(component.createdAt).toISOString() : "", component.updatedAt ? new Date(component.updatedAt).toISOString() : ""]);
        const csv = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
        return { csv, total: components.length };
    }
}
//# sourceMappingURL=component.service.js.map