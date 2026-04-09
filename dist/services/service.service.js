import { Types } from 'mongoose';
import { Service } from '../models/service.model.js';
import { Product } from '../models/product.model.js';
export class ServiceService {
    static async createService(payload) {
        if (!payload.name?.trim())
            throw new Error("Service name is required");
        if (!payload.shortDescription?.trim())
            throw new Error("Short description is required");
        if (!payload.fullDescription?.trim())
            throw new Error("Full description is required");
        if (!payload.category?.trim())
            throw new Error("Category is required");
        if (!payload.locations?.length)
            throw new Error("At least one location is required");
        if (!payload.thumbnailImage?.trim())
            throw new Error("Thumbnail image is required");
        const serviceData = {
            name: payload.name.trim(),
            shortDescription: payload.shortDescription.trim(),
            fullDescription: payload.fullDescription.trim(),
            category: payload.category.trim(),
            locations: payload.locations,
            thumbnailImage: payload.thumbnailImage.trim(),
            isActive: true,
        };
        if (payload.bannerImage?.trim()) {
            serviceData.bannerImage = payload.bannerImage.trim();
        }
        const service = await Service.create(serviceData);
        return service;
    }
    static async updateService(serviceId, updateData) {
        const updateFields = {};
        if (updateData.name !== undefined) {
            if (!updateData.name.trim()) {
                throw new Error("Service name cannot be empty");
            }
            updateFields.name = updateData.name.trim();
        }
        if (updateData.shortDescription !== undefined) {
            if (!updateData.shortDescription.trim()) {
                throw new Error("Short description cannot be empty");
            }
            updateFields.shortDescription = updateData.shortDescription.trim();
        }
        if (updateData.fullDescription !== undefined) {
            updateFields.fullDescription = updateData.fullDescription;
        }
        if (updateData.category !== undefined) {
            updateFields.category = updateData.category;
        }
        if (updateData.locations !== undefined) {
            if (!Array.isArray(updateData.locations) || updateData.locations.length === 0) {
                throw new Error("At least one location is required");
            }
            updateFields.locations = updateData.locations;
        }
        if (updateData.thumbnailImage !== undefined) {
            updateFields.thumbnailImage = updateData.thumbnailImage;
        }
        if (updateData.bannerImage !== undefined) {
            updateFields.bannerImage = updateData.bannerImage;
        }
        if ("subServices" in updateData) {
            throw new Error("SubServices cannot be updated via updateService API");
        }
        if ("isActive" in updateData) {
            throw new Error("Use toggleServiceStatus API to update status");
        }
        if (Object.keys(updateFields).length === 0) {
            throw new Error("No valid fields provided for update");
        }
        const service = await Service.findByIdAndUpdate(serviceId, { $set: updateFields }, { new: true, runValidators: true });
        if (!service)
            throw new Error("Service not found");
        return service;
    }
    static async toggleServiceStatus(serviceId, isActive) {
        const service = await Service.findByIdAndUpdate(serviceId, { isActive }, { new: true });
        if (!service)
            throw new Error("Service not found");
        return {
            success: true,
            message: `Service ${isActive ? "activated" : "deactivated"} successfully`
        };
    }
    static async getServiceById(serviceId) {
        const service = await Service.findById(serviceId).lean();
        if (!service)
            throw new Error("Service not found");
        const allVariantIds = service.subServices.flatMap(sub => sub.variants.map(v => v.variantId));
        // Fetch products that contain any of the variants in the service
        const products = await Product.find({
            "variants._id": { $in: allVariantIds },
            isActive: true
        }).lean();
        const variantMap = new Map();
        products.forEach(product => {
            product.variants.forEach((variant) => {
                if (!variant.isActive)
                    return;
                const isSelected = allVariantIds.some(id => id.toString() === variant._id.toString());
                if (isSelected) {
                    // 2. Filter ALL variants in this product that share the same location
                    const availableVariants = product.variants.filter((v) => v.isActive && v.location === variant.location);
                    variantMap.set(variant._id.toString(), {
                        productId: product._id,
                        productName: product.name,
                        categoryName: product.categoryName,
                        ...variant,
                        availableVariants
                    });
                }
            });
        });
        const enrichedSubServices = service.subServices
            .map(sub => {
            const variants = sub.variants
                .map(v => {
                const variantData = variantMap.get(v.variantId.toString());
                if (!variantData)
                    return null;
                return {
                    ...variantData,
                    isOptional: v.isOptional,
                    isEditable: v.isEditable,
                    displayOrder: v.displayOrder
                };
            })
                .filter(Boolean);
            return { ...sub, variants };
        })
            .filter(sub => sub.variants.length > 0);
        return { ...service, subServices: enrichedSubServices };
    }
    static async addSubService(serviceId, payload) {
        if (!payload.name || !payload.name.trim()) {
            throw new Error("SubService name is required");
        }
        const existing = await Service.findOne({
            _id: serviceId,
            "subServices.name": payload.name.trim()
        });
        if (existing) {
            throw new Error("A sub-service with this name already exists in this service");
        }
        if (payload.displayOrder !== undefined && payload.displayOrder < 0) {
            throw new Error("Display order must be >= 0");
        }
        const subService = {
            name: payload.name.trim(),
            description: payload.description,
            displayOrder: payload.displayOrder ?? 0,
            variants: []
        };
        const service = await Service.findByIdAndUpdate(serviceId, { $push: { subServices: subService } }, { new: true, runValidators: true });
        if (!service)
            throw new Error("Service not found");
        return service;
    }
    static async updateSubService(serviceId, subServiceId, updateData) {
        const updateFields = {};
        if (updateData.name !== undefined) {
            const trimmedName = updateData.name.trim();
            if (!trimmedName) {
                throw new Error("SubService name cannot be empty");
            }
            const existing = await Service.findOne({
                _id: serviceId,
                "subServices.name": trimmedName,
                "subServices._id": { $ne: subServiceId }
            });
            if (existing) {
                throw new Error("A sub-service with this name already exists in this service");
            }
            updateFields["subServices.$.name"] = trimmedName;
        }
        if (updateData.description !== undefined) {
            updateFields["subServices.$.description"] = updateData.description;
        }
        if (updateData.displayOrder !== undefined) {
            if (updateData.displayOrder < 0) {
                throw new Error("Display order must be >= 0");
            }
            updateFields["subServices.$.displayOrder"] = updateData.displayOrder;
        }
        if (Object.keys(updateFields).length === 0) {
            throw new Error("No valid fields provided for update");
        }
        const service = await Service.findOneAndUpdate({ _id: serviceId, "subServices._id": subServiceId }, { $set: updateFields }, { new: true, runValidators: true });
        if (!service)
            throw new Error("Service or SubService not found");
        return service;
    }
    static async toggleSubServiceStatus(serviceId, subServiceId, isActive) {
        const service = await Service.findOneAndUpdate({
            _id: serviceId,
            "subServices._id": subServiceId
        }, {
            $set: {
                "subServices.$.isActive": isActive
            }
        }, { new: true });
        if (!service) {
            throw new Error("Service or Sub-service not found");
        }
        return {
            success: true,
            message: `Sub-service ${isActive ? "activated" : "deactivated"} successfully`
        };
    }
    static async addVariantsToSubService(serviceId, subServiceId, isComplete, variants) {
        if (!variants || variants.length === 0) {
            throw new Error("Variants array is required");
        }
        const variantIds = variants.map(v => v.variantId);
        const uniqueIds = [...new Set(variantIds)];
        const products = await Product.find({
            "variants._id": { $in: uniqueIds }
        }).lean();
        const variantMap = new Map();
        for (const product of products) {
            for (const variant of product.variants) {
                variantMap.set(variant._id.toString(), variant);
            }
        }
        for (const id of uniqueIds) {
            if (!variantMap.has(id)) {
                throw new Error(`Invalid variantId: ${id}`);
            }
        }
        const service = await Service.findById(serviceId);
        if (!service)
            throw new Error("Service not found");
        const subService = service.subServices.find(v => v._id.toString() === subServiceId);
        if (!subService)
            throw new Error("SubService not found");
        // 6. Validate location + active
        for (const input of variants) {
            const variant = variantMap.get(input.variantId);
            if (!variant.isActive) {
                throw new Error(`Variant ${input.variantId} is inactive`);
            }
            if (!service.locations.includes(variant.location)) {
                throw new Error(`Variant ${input.variantId} does not belong to service location`);
            }
        }
        const existingIds = new Set(subService.variants.map(v => v.variantId.toString()));
        for (const input of variants) {
            if (existingIds.has(input.variantId)) {
                throw new Error(`Variant already exists: ${input.variantId}`);
            }
        }
        const newVariants = variants.map(v => ({
            variantId: new Types.ObjectId(v.variantId),
            displayOrder: v.displayOrder ?? 0,
            isOptional: v.isOptional ?? false,
            isEditable: v.isEditable ?? true,
        }));
        subService.variants.push(...newVariants);
        service.isComplete = isComplete;
        await service.save();
        return service;
    }
    static async updateVariantInSubService(serviceId, subServiceId, variantId, isComplete, updateData) {
        const service = await Service.findById(serviceId);
        if (!service)
            throw new Error("Service not found");
        const subService = service.subServices.find(v => v._id.toString() === subServiceId);
        if (!subService)
            throw new Error("SubService not found");
        const variant = subService.variants.find(v => v.variantId.toString() === variantId);
        if (!variant) {
            throw new Error("Variant not found in subService");
        }
        if (updateData.isOptional !== undefined) {
            variant.isOptional = updateData.isOptional;
        }
        if (updateData.isEditable !== undefined) {
            variant.isEditable = updateData.isEditable;
        }
        if (updateData.displayOrder !== undefined) {
            variant.displayOrder = updateData.displayOrder;
        }
        service.isComplete = isComplete;
        await service.save();
        return service;
    }
    static async removeVariantFromSubService(serviceId, subServiceId, variantId) {
        const service = await Service.findById(serviceId);
        if (!service) {
            throw new Error("Service not found");
        }
        const subService = service.subServices.find(v => v._id.toString() === subServiceId);
        if (!subService) {
            throw new Error("SubService not found");
        }
        const initialLength = subService.variants.length;
        subService.variants = subService.variants.filter((v) => v.variantId.toString() !== variantId);
        if (subService.variants.length === initialLength) {
            throw new Error("Variant not found in subService");
        }
        await service.save();
        return service;
    }
    static async getServiceWithProducts(serviceId, location) {
        const service = await Service.findById(serviceId).lean();
        if (!service)
            throw new Error("Service not found");
        const allVariantIds = service.subServices.flatMap(sub => sub.variants.map(v => v.variantId));
        const products = await Product.find({
            "variants._id": { $in: allVariantIds },
            "variants.location": location,
            isActive: true
        }).lean();
        const variantMap = new Map();
        for (const product of products) {
            for (const variant of product.variants) {
                if (variant.location === location && variant.isActive) {
                    variantMap.set(variant._id.toString(), {
                        productId: product._id,
                        productName: product.name,
                        categoryName: product.categoryName,
                        variant
                    });
                }
            }
        }
        const updatedSubServices = service.subServices.map(sub => {
            const productsMap = new Map();
            sub.variants.forEach(config => {
                const data = variantMap.get(config.variantId.toString());
                if (!data)
                    return;
                const key = data.productId.toString();
                if (!productsMap.has(key)) {
                    productsMap.set(key, {
                        _id: data.productId,
                        name: data.productName,
                        categoryName: data.categoryName,
                        variants: []
                    });
                }
                productsMap.get(key).variants.push({
                    _id: data.variant._id,
                    tier: data.variant.tier,
                    price: data.variant.price,
                    location: data.variant.location,
                    description: data.variant.description,
                    isOptional: config.isOptional,
                    isEditable: config.isEditable,
                    displayOrder: config.displayOrder
                });
            });
            return {
                ...sub,
                products: Array.from(productsMap.values())
            };
        }).filter(sub => sub.products.length > 0);
        return {
            ...service,
            subServices: updatedSubServices
        };
    }
    static async FindServices(searchTerm, locationFilter, categoryFilter, limit = 20, page = 1, isActive, isComplete, sortBy = 'createdAt', sortOrder = 'desc') {
        const skip = (page - 1) * limit;
        const matchQuery = {};
        if (isActive !== undefined)
            matchQuery.isActive = isActive;
        if (isComplete !== undefined)
            matchQuery.isComplete = isComplete;
        if (searchTerm)
            matchQuery.$text = { $search: searchTerm };
        if (locationFilter)
            matchQuery.locations = locationFilter;
        if (categoryFilter)
            matchQuery.category = categoryFilter;
        let sortCriteria = {};
        if (searchTerm && sortBy === 'relevance') {
            sortCriteria = { score: { $meta: "textScore" } };
        }
        else {
            sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
        }
        try {
            const pipeline = [
                { $match: matchQuery },
                ...(searchTerm ? [{ $addFields: { score: { $meta: "textScore" } } }] : []),
                { $sort: sortCriteria },
                { $skip: skip },
                { $limit: limit },
                // 1. Unwind carefully
                { $unwind: { path: "$subServices", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$subServices.variants", preserveNullAndEmptyArrays: true } },
                // 2. Convert ID for lookup
                {
                    $addFields: {
                        "subServices.variants.variantId": {
                            $cond: [
                                {
                                    $and: [
                                        { $gt: ["$subServices.variants.variantId", null] },
                                        { $ne: ["$subServices.variants.variantId", ""] }
                                    ]
                                },
                                { $toObjectId: "$subServices.variants.variantId" },
                                null
                            ]
                        }
                    }
                },
                // 3. Lookup product info
                {
                    $lookup: {
                        from: "products",
                        localField: "subServices.variants.variantId",
                        foreignField: "variants._id",
                        as: "productInfo"
                    }
                },
                { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
                // 4. Map details back to the variant
                {
                    $addFields: {
                        "subServices.variants.productDetails": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$productInfo.variants",
                                        as: "v",
                                        cond: { $eq: ["$$v._id", "$subServices.variants.variantId"] }
                                    }
                                },
                                0
                            ]
                        },
                        "subServices.variants.productName": "$productInfo.name",
                        "subServices.variants.productImage": "$productInfo.imageUrl"
                    }
                },
                // 5. Group variants back into SubServices
                {
                    $group: {
                        _id: {
                            serviceId: "$_id",
                            subId: { $ifNull: ["$subServices._id", "no_sub"] }
                        },
                        root: { $first: "$$ROOT" },
                        variants: {
                            $push: {
                                $cond: [
                                    { $gt: ["$subServices.variants.variantId", null] },
                                    "$subServices.variants",
                                    "$$REMOVE"
                                ]
                            }
                        }
                    }
                },
                // 6. Group SubServices back into the Main Service
                {
                    $group: {
                        _id: "$_id.serviceId",
                        name: { $first: "$root.name" },
                        category: { $first: "$root.category" },
                        locations: { $first: "$root.locations" },
                        thumbnailImage: { $first: "$root.thumbnailImage" },
                        bannerImage: { $first: "$root.bannerImage" },
                        shortDescription: { $first: "$root.shortDescription" },
                        fullDescription: { $first: "$root.fullDescription" },
                        createdAt: { $first: "$root.createdAt" },
                        isActive: { $first: "$root.isActive" },
                        subServices: {
                            $push: {
                                $cond: [
                                    { $ne: ["$_id.subId", "no_sub"] },
                                    {
                                        _id: "$_id.subId",
                                        name: "$root.subServices.name",
                                        description: "$root.subServices.description",
                                        displayOrder: "$root.subServices.displayOrder",
                                        variants: "$variants"
                                    },
                                    "$$REMOVE"
                                ]
                            }
                        }
                    }
                },
                // Re-sort because grouping loses order
                { $sort: sortCriteria }
            ];
            const [data, total] = await Promise.all([
                Service.aggregate(pipeline),
                Service.countDocuments(matchQuery)
            ]);
            return { data, total, page, totalPages: Math.ceil(total / limit) };
        }
        catch (error) {
            throw new Error(`Service fetch failed: ${error.message}`);
        }
    }
    static async getServicesByFilters(categories, locations, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const matchQuery = { isActive: true };
        if (categories) {
            matchQuery.category = { $in: Array.isArray(categories) ? categories : [categories] };
        }
        if (locations) {
            matchQuery.locations = { $in: Array.isArray(locations) ? locations : [locations] };
        }
        const pipeline = [
            { $match: matchQuery },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            { $unwind: { path: "$subServices", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$subServices.variants", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "products",
                    localField: "subServices.variants.variantId",
                    foreignField: "variants._id",
                    as: "productInfo"
                }
            },
            { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    "subServices.variants.productDetails": {
                        $filter: {
                            input: "$productInfo.variants",
                            as: "v",
                            cond: { $eq: ["$$v._id", "$subServices.variants.variantId"] }
                        }
                    },
                    "subServices.variants.productName": "$productInfo.name",
                    "subServices.variants.productImage": "$productInfo.imageUrl"
                }
            },
            {
                $addFields: {
                    "subServices.variants.productDetails": { $arrayElemAt: ["$subServices.variants.productDetails", 0] }
                }
            },
            {
                $group: {
                    _id: { serviceId: "$_id", subServiceId: "$subServices._id" },
                    serviceDoc: { $first: "$$ROOT" },
                    subServiceName: { $first: "$subServices.name" },
                    subServiceDesc: { $first: "$subServices.description" },
                    variants: { $push: "$subServices.variants" }
                }
            },
            {
                $group: {
                    _id: "$_id.serviceId",
                    name: { $first: "$serviceDoc.name" },
                    category: { $first: "$serviceDoc.category" },
                    locations: { $first: "$serviceDoc.locations" },
                    thumbnailImage: { $first: "$serviceDoc.thumbnailImage" },
                    subServices: {
                        $push: {
                            _id: "$_id.subServiceId",
                            name: "$subServiceName",
                            description: "$subServiceDesc",
                            variants: {
                                $filter: {
                                    input: "$variants",
                                    as: "v",
                                    cond: { $ne: ["$$v", {}] }
                                }
                            }
                        }
                    }
                }
            }
        ];
        const [services, total] = await Promise.all([
            Service.aggregate(pipeline),
            Service.countDocuments(matchQuery)
        ]);
        return { services, total };
    }
}
;
//# sourceMappingURL=service.service.js.map