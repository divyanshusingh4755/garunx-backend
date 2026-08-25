import { Types } from "mongoose";
import { ComponentItem } from "../models/componentitem.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";
const createHttpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
export class ComponentItemService {
    static async invalidateComponentItemCache(componentItemId) {
        const operations = [RedisCacheService.deleteByPattern(CacheKeys.componentItemListPattern())];
        if (componentItemId) {
            operations.push(RedisCacheService.delete(CacheKeys.componentItemDetail(componentItemId)));
        }
        await Promise.all(operations);
    }
    static async invalidateAffectedServiceCaches(componentItemId) {
        const mappings = await ServiceComponent.find({ items: { $elemMatch: { itemId: new Types.ObjectId(componentItemId) } } }).select("serviceId").lean();
        const serviceIds = [...new Set(mappings.map((mapping) => mapping.serviceId.toString()))];
        await Promise.all(serviceIds.flatMap((serviceId) => [
            RedisCacheService.delete(CacheKeys.serviceFull(serviceId)),
            RedisCacheService.deleteByPattern(CacheKeys.serviceFullByCitiesPattern(serviceId)),
            RedisCacheService.deleteByPattern(CacheKeys.serviceResolvedPricingByServicePattern(serviceId)),
            RedisCacheService.deleteByPattern(CacheKeys.serviceComponentsByServicePattern(serviceId)),
        ]));
    }
    static async createComponentItem(payload) {
        try {
            const componentItem = await ComponentItem.create(payload);
            await this.invalidateComponentItemCache();
            return componentItem;
        }
        catch (error) {
            if (error?.code === 11000) {
                throw createHttpError("Component item already exists", 409);
            }
            throw error;
        }
    }
    static async updateComponentItem(componentItemId, updateData) {
        try {
            const componentItem = await ComponentItem.findByIdAndUpdate(componentItemId, { $set: updateData }, { new: true, runValidators: true }).lean();
            if (!componentItem) {
                throw createHttpError("Component item not found", 404);
            }
            await Promise.all([
                this.invalidateComponentItemCache(componentItemId),
                this.invalidateAffectedServiceCaches(componentItemId),
            ]);
            return componentItem;
        }
        catch (error) {
            if (error?.code === 11000) {
                throw createHttpError("Component item already exists", 409);
            }
            throw error;
        }
    }
    static async getComponentItemById(componentItemId) {
        return RedisCacheService.getOrSet({
            key: CacheKeys.componentItemDetail(componentItemId),
            ttlSeconds: CACHE_TTL_SECONDS.COMPONENT_ITEM_DETAIL,
            loader: async () => {
                const componentItem = await ComponentItem.findById(componentItemId).lean();
                if (!componentItem) {
                    throw createHttpError("Component item not found", 404);
                }
                return componentItem;
            },
        });
    }
    static async getAllComponentItems(params) {
        const { searchTerm, limit = 20, page = 1, isActive, sortBy = "createdAt", sortOrder = "desc" } = params;
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        const term = searchTerm?.trim();
        const isTextSearch = Boolean(term && term.length > 4);
        const allowedSortFields = new Set(["name", "price", "isActive", "createdAt", "updatedAt"]);
        const safeSortBy = isTextSearch && sortBy === "relevance" ? "relevance" : allowedSortFields.has(sortBy) ? sortBy : "createdAt";
        const cacheKey = CacheKeys.componentItemList({ searchTerm: term, limit: safeLimit, page: safePage, isActive, sortBy: safeSortBy, sortOrder });
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS.COMPONENT_ITEM_LIST,
            loader: async () => {
                const skip = (safePage - 1) * safeLimit;
                const query = {};
                if (typeof isActive === "boolean") {
                    query.isActive = isActive;
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
                const [componentItems, total] = await Promise.all([
                    ComponentItem.find(query, projection).sort(sortCriteria).skip(skip).limit(safeLimit).lean(),
                    ComponentItem.countDocuments(query),
                ]);
                return {
                    data: componentItems, total, page: safePage, totalPages: Math.ceil(total / safeLimit),
                };
            },
        });
    }
    static async getDeactivationImpact(componentItemId) {
        const itemId = new Types.ObjectId(componentItemId);
        const affected = await ServiceComponent.find({ items: { $elemMatch: { itemId } } }, { _id: 1, serviceId: 1, componentId: 1, items: 1 }).lean();
        return { affectedServiceComponentsCount: affected.length, affected };
    }
    static async updateComponentItemStatus(componentItemId, isActive, confirmed = false) {
        const componentItem = await ComponentItem.findById(componentItemId).select("_id isActive").lean();
        if (!componentItem) {
            throw createHttpError("Component item not found", 404);
        }
        if (componentItem.isActive === isActive) {
            return { success: true, unchanged: true, componentItem };
        }
        if (!isActive && !confirmed) {
            const impact = await this.getDeactivationImpact(componentItemId);
            if (impact.affectedServiceComponentsCount > 0) {
                return { requiresConfirmation: true, impact };
            }
        }
        const updatedComponentItem = await ComponentItem.findByIdAndUpdate(componentItemId, { $set: { isActive } }, { new: true, runValidators: true }).lean();
        if (!updatedComponentItem) {
            throw createHttpError("Component item not found", 404);
        }
        await Promise.all([
            this.invalidateComponentItemCache(componentItemId),
            this.invalidateAffectedServiceCaches(componentItemId),
        ]);
        return { success: true, componentItem: updatedComponentItem };
    }
    static async exportComponentItemsToCsv(componentItemIds) {
        const uniqueIds = [...new Set(componentItemIds)];
        const componentItems = await ComponentItem.find({ _id: { $in: uniqueIds } }).select("_id name price isActive createdAt updatedAt").lean();
        if (componentItems.length === 0) {
            throw createHttpError("No component items found for export", 404);
        }
        const escapeCsv = (value) => {
            if (value === null || value === undefined) {
                return "";
            }
            const stringValue = String(value);
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n") || stringValue.includes("\r")) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };
        const headers = ["Component Item ID", "Name", "Price", "Active", "Created At", "Updated At"];
        const rows = componentItems.map((item) => [item._id.toString(), item.name, item.price ?? "", item.isActive ? "Yes" : "No", item.createdAt ? new Date(item.createdAt).toISOString() : "", item.updatedAt ? new Date(item.updatedAt).toISOString() : ""]);
        const csv = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
        return { csv, total: componentItems.length };
    }
}
export default ComponentItemService;
//# sourceMappingURL=componentitem.service.js.map