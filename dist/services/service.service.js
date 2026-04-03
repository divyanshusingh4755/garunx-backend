import mongoose, { Types } from 'mongoose';
import { Service } from '../models/service.model.js';
import { Product } from '../models/product.model.js';
export class ServiceService {
    static async createService(payload) {
        const service = await Service.create(payload);
        return service;
    }
    static async updateService(serviceId, updateData) {
        const service = await Service.findByIdAndUpdate(serviceId, { $set: updateData }, { new: true, runValidators: true });
        if (!service)
            throw new Error("Service not found");
        return service;
    }
    static async deleteService(serviceId) {
        const service = await Service.findByIdAndUpdate(serviceId, { isActive: false }, { new: true });
        if (!service)
            throw new Error("Service not found");
        return service;
    }
    static async getServiceById(serviceId) {
        const service = await Service.findById(serviceId).lean();
        if (!service)
            throw new Error("Service not found");
        return service;
    }
    static async addSubService(serviceId, payload) {
        const subService = {
            ...payload,
            productIds: []
        };
        const existing = await Service.findOne({
            _id: serviceId,
            "subServices.slug": payload.slug
        });
        if (existing) {
            throw new Error("SubService slug already exists");
        }
        const service = await Service.findByIdAndUpdate(serviceId, { $push: { subServices: subService } }, { new: true, runValidators: true });
        if (!service)
            throw new Error('Service not found');
        return service;
    }
    static async updateSubService(serviceId, subServiceId, updateData) {
        const updateFields = {};
        if (updateData.name)
            updateFields["subServices.$.name"] = updateData.name;
        if (updateData.slug)
            updateFields["subServices.$.slug"] = updateData.slug;
        if (updateData.description)
            updateFields["subServices.$.description"] = updateData.description;
        if (updateData.displayOrder !== undefined)
            updateFields["subServices.$.displayOrder"] = updateData.displayOrder;
        const service = await Service.findOneAndUpdate({ _id: serviceId, "subServices._id": subServiceId }, { $set: updateFields }, { new: true, runValidators: true });
        if (!service)
            throw new Error("SubService not found");
        return service;
    }
    static async deleteSubService(serviceId, subServiceId) {
        const service = await Service.findByIdAndUpdate(serviceId, { $pull: { subServices: { _id: subServiceId } } }, { new: true });
        if (!service)
            throw new Error("Service not found");
        return service;
    }
    static async addProductsToSubService(serviceId, subServiceId, productIds) {
        const products = await Product.find({
            _id: { $in: productIds }
        }).select("_id");
        if (products.length !== productIds.length) {
            throw new Error("Some products do not exist");
        }
        const objectIds = productIds.map(id => new Types.ObjectId(id));
        const service = await Service.findOneAndUpdate({
            _id: serviceId,
            "subServices._id": subServiceId
        }, {
            $addToSet: {
                "subServices.$.productIds": { $each: objectIds }
            }
        }, { new: true }).populate('subServices.productIds'); // Optional: return populated products
        if (!service)
            throw new Error("Service or SubService not found");
        return service;
    }
    static async removeProductFromSubService(serviceId, subServiceId, productId) {
        const service = await Service.findOneAndUpdate({
            _id: serviceId,
            "subServices._id": subServiceId
        }, {
            $pull: {
                "subServices.$.productIds": productId
            }
        }, { new: true }).populate('subServices.productIds');
        if (!service) {
            throw new Error("Service or SubService not found");
        }
        return service;
    }
    static async getServiceWithProducts(serviceId, location) {
        const service = await Service.findById(serviceId)
            .populate({
            path: "subServices.productIds",
            model: "Product"
        })
            .lean();
        if (!service)
            throw new Error("Service not found");
        // Filter variants by location
        const updatedSubServices = service.subServices.map(sub => ({
            ...sub,
            productIds: sub.productIds
                .map((product) => ({
                ...product,
                variants: product.variants.filter((v) => v.location === location)
            }))
                .filter((product) => product.variants.length > 0)
        }));
        return {
            ...service,
            subServices: updatedSubServices
        };
    }
    static async FindServices(searchTerm, locationFilter, categoryFilter, limit = 20, page = 1, isActive = true, sortBy = 'createdAt', sortOrder = 'desc') {
        const skip = (page - 1) * limit;
        const query = { isActive };
        if (searchTerm)
            query.$text = { $search: searchTerm };
        if (locationFilter)
            query.locations = locationFilter;
        if (categoryFilter)
            query.category = categoryFilter;
        let sortCriteria = {};
        let projection = {};
        if (searchTerm && sortBy === 'relevance') {
            projection = { score: { $meta: "textScore" } };
            sortCriteria = { score: { $meta: "textScore" } };
        }
        else {
            sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
            if (sortBy !== 'createdAt')
                sortCriteria['createdAt'] = -1;
        }
        try {
            const [data, total] = await Promise.all([
                Service.find(query, projection)
                    .select("name shortDescription thumbnailImage locations category isActive")
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Service.countDocuments(query)
            ]);
            return {
                data,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            };
        }
        catch (error) {
            throw new Error(`Service fetch failed: ${error.message}`);
        }
    }
}
;
//# sourceMappingURL=service.service.js.map