import mongoose, { Types } from 'mongoose';
import { Service, type IService } from '../models/service.model.js';
import { Product } from '../models/product.model.js';

export class ServiceService {
    static async createService(payload: Partial<IService>) {
        const service = await Service.create(payload);
        return service;
    }

    static async updateService(serviceId: string, updateData: any) {
        const service = await Service.findByIdAndUpdate(
            serviceId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!service) throw new Error("Service not found");

        return service;
    }

    static async deleteService(serviceId: string) {
        const service = await Service.findByIdAndUpdate(
            serviceId,
            { isActive: false },
            { new: true }
        );

        if (!service) throw new Error("Service not found");

        return service;
    }

    static async getServiceById(serviceId: string) {
        const serviceData = await Service.aggregate([
            { $match: { _id: new Types.ObjectId(serviceId) } },
            { $unwind: { path: "$subServices", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "products",
                    localField: "subServices.variantIds",
                    foreignField: "variants._id",
                    as: "matchedProducts"
                }
            },
            {
                $addFields: {
                    "subServices.variants": {
                        $map: {
                            input: "$subServices.variantIds",
                            as: "vId",
                            in: {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: {
                                                $reduce: {
                                                    input: "$matchedProducts.variants",
                                                    initialValue: [],
                                                    in: { $concatArrays: ["$$value", "$$this"] }
                                                }
                                            },
                                            as: "flatVariant",
                                            cond: { $eq: ["$$flatVariant._id", "$$vId"] }
                                        }
                                    },
                                    0
                                ]
                            }
                        }
                    }
                }
            },
            { $project: { matchedProducts: 0, "subServices.variantIds": 0 } },
            {
                $group: {
                    _id: "$_id",
                    name: { $first: "$name" },
                    category: { $first: "$category" },
                    locations: { $first: "$locations" },
                    shortDescription: { $first: "$shortDescription" },
                    fullDescription: { $first: "$fullDescription" },
                    thumbnailImage: { $first: "$thumbnailImage" },
                    bannerImage: { $first: "$bannerImage" },
                    isActive: { $first: "$isActive" },
                    subServices: { $push: "$subServices" },
                    createdAt: { $first: "$createdAt" },
                    updatedAt: { $first: "$updatedAt" }
                }
            }
        ]);

        if (!serviceData || serviceData.length === 0) throw new Error("Service not found");

        return serviceData[0];
    }

    static async addSubService(serviceId: string, payload: {
        name: string;
        slug: string;
        description?: string;
        displayOrder?: number;
    }) {
        const existing = await Service.findOne({
            _id: serviceId,
            "subServices.slug": payload.slug
        });

        if (existing) {
            throw new Error("SubService slug already exists");
        }

        const subService = {
            ...payload,
            variantIds: []
        };

        const service = await Service.findByIdAndUpdate(
            serviceId,
            { $push: { subServices: subService } },
            { new: true, runValidators: true }
        );

        if (!service) throw new Error('Service not found')

        return service;
    }

    static async updateSubService(
        serviceId: string,
        subServiceId: string,
        updateData: {
            name?: string;
            slug?: string;
            description?: string;
            displayOrder?: number
        }
    ) {
        const updateFields: any = {};

        Object.entries(updateData).forEach(([key, value]) => {
            if (value != undefined) {
                updateFields[`subServices.$.${key}`] = value
            }
        })

        if (Object.keys(updateFields).length === 0) {
            return await Service.findById(serviceId);
        }

        const service = await Service.findOneAndUpdate(
            { _id: serviceId, "subServices._id": subServiceId },
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!service) throw new Error("SubService not found")
        return service
    }

    static async deleteSubService(serviceId: string, subServiceId: string) {
        const service = await Service.findByIdAndUpdate(
            serviceId,
            { $pull: { subServices: { _id: subServiceId } } },
            { new: true }
        );

        if (!service) throw new Error("Service not found")

        return service;
    }

    static async addProductsToSubService(
        serviceId: string,
        subServiceId: string,
        variantIds: string[]
    ) {
        const products = await Product.find({
            "variants._id": { $in: variantIds }
        })

        const foundIds = products
            .flatMap(p => p.variants.map(v => v._id.toString()))
            .filter(id => variantIds.includes(id))

        const uniqueInputIds = [...new Set(variantIds)]
        if (foundIds.length < uniqueInputIds.length) {
            throw new Error("One or more Variant IDs are invalid or do not exist")
        }

        const service = await Service.findOneAndUpdate(
            {
                _id: serviceId,
                "subServices._id": subServiceId
            },
            {
                $addToSet: {
                    "subServices.$.variantIds": { $each: variantIds }
                }
            },
            { new: true }
        );

        if (!service) throw new Error("Service or SubService not found");

        return service;
    }

    static async removeProductFromSubService(
        serviceId: string,
        subServiceId: string,
        variantId: string
    ) {
        const service = await Service.findOneAndUpdate(
            {
                _id: serviceId,
                "subServices._id": subServiceId
            },
            {
                $pull: {
                    "subServices.$.variantIds": variantId
                }
            },
            { new: true }
        );

        if (!service) {
            throw new Error("Service or SubService not found");
        }

        return service;
    }

    static async getServiceWithProducts(serviceId: string, location: string) {
        const service = await Service.findById(serviceId).lean();
        if (!service) throw new Error("Service not found");

        const allVariantIds = service.subServices.flatMap(sub => sub.variantIds);

        const products = await Product.find({
            variants: {
                $elemMatch: {
                    _id: { $in: allVariantIds },
                    location: location
                }
            }
        }).lean();

        const updatedSubServices = service.subServices.map(sub => {
            const matchedProducts: any[] = [];

            products.forEach(product => {
                const subServiceVariants = product.variants.filter(v =>
                    sub.variantIds.some(vid => vid.toString() === v._id.toString()) &&
                    v.location === location
                );

                if (subServiceVariants.length > 0) {
                    matchedProducts.push({
                        _id: product._id,
                        name: product.name,
                        categoryName: product.categoryName,
                        variants: subServiceVariants
                    });
                }
            });

            return {
                ...sub,
                products: matchedProducts
            };
        }).filter(sub => sub.products.length > 0);

        return {
            ...service,
            subServices: updatedSubServices
        };
    }

    static async FindServices(
        searchTerm?: string,
        locationFilter?: string,
        categoryFilter?: string,
        limit: number = 20,
        page: number = 1,
        isActive: boolean = true,
        sortBy: string = 'createdAt',
        sortOrder: 'asc' | 'desc' = 'desc'
    ) {
        const skip = (page - 1) * limit;
        const query: any = { isActive };

        if (searchTerm) query.$text = { $search: searchTerm };
        if (locationFilter) query.locations = locationFilter;
        if (categoryFilter) query.category = categoryFilter;

        let sortCriteria: any = {};
        let projection: any = {};

        if (searchTerm && sortBy === 'relevance') {
            projection = { score: { $meta: "textScore" } };
            sortCriteria = { score: { $meta: "textScore" } };
        } else {
            sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
            if (sortBy !== 'createdAt') sortCriteria['createdAt'] = -1;
        }

        try {
            const [data, total] = await Promise.all([
                Service.find(query, projection)
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
        } catch (error: any) {
            throw new Error(`Service fetch failed: ${error.message}`);
        }
    }

    static async getServicesByFilters(
        categories?: string | string[],
        locations?: string | string[],
        page: number = 1,
        limit: number = 10
    ): Promise<{ services: IService[]; total: number }> {
        const skip = (page - 1) * limit;
        const query: any = { isActive: true };

        if (categories && (Array.isArray(categories) ? categories.length > 0 : true)) {
            query.category = { $in: Array.isArray(categories) ? categories : [categories] }
        }

        if (locations && (Array.isArray(locations) ? locations.length > 0 : true)) {
            query.locations = { $in: Array.isArray(locations) ? locations : [locations] }
        }

        const [services, total] = await Promise.all([
            Service.find(query)
                .select("-subServices.variantIds")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Service.countDocuments(query)
        ]);

        return { services, total };
    }
};
