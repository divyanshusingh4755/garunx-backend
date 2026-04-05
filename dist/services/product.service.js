import { Product } from "../models/product.model.js";
export class ProductService {
    static async createProduct(payload) {
        try {
            const product = await Product.create(payload);
            return product;
        }
        catch (error) {
            if (error.code === 11000) {
                throw new Error("Product already exists");
            }
            throw new Error(error.message || "Failed to create product");
        }
    }
    static async updateProduct(productId, updateData) {
        try {
            const product = await Product.findByIdAndUpdate(productId, { $set: updateData }, { new: true, runValidators: true });
            if (!product)
                throw new Error("Product not found");
            return product;
        }
        catch (error) {
            throw new Error(error.message || "Failed to update product");
        }
    }
    static async deleteProduct(productId) {
        const product = await Product.findByIdAndDelete(productId);
        if (!product)
            throw new Error("Product not found");
        return { success: true };
    }
    static async getProductById(productId) {
        const product = await Product.findById(productId).lean();
        if (!product)
            throw new Error("Product not found");
        return product;
    }
    static async FindProducts(searchTerm, categoryFilter, locationFilter, tierFilter, limit = 20, page = 1, isRemovable, sortBy = 'createdAt', sortOrder = 'desc') {
        const skip = (page - 1) * limit;
        const query = {};
        if (typeof isRemovable === 'boolean') {
            query.isRemovable = isRemovable;
        }
        if (searchTerm)
            query.$text = { $search: searchTerm };
        if (categoryFilter)
            query.categoryName = categoryFilter;
        if (locationFilter)
            query["variants.location"] = locationFilter;
        if (tierFilter)
            query["variants.tier"] = tierFilter;
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
                Product.find(query, projection)
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Product.countDocuments(query)
            ]);
            return {
                data,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            };
        }
        catch (error) {
            throw new Error(`Product fetch failed: ${error.message}`);
        }
    }
    static async addVariant(productId, variant) {
        const product = await Product.findByIdAndUpdate(productId, { $push: { variants: variant } }, { new: true, runValidators: true });
        if (!product)
            throw new Error("Product not found");
        return product;
    }
    static async updateVariant(productId, variantId, updateData) {
        const updateFields = {};
        for (const key in updateData) {
            if (key !== '_id') {
                updateFields[`variants.$.${key}`] = updateData[key];
            }
        }
        const product = await Product.findOneAndUpdate({ _id: productId, "variants._id": variantId }, { $set: updateFields }, { new: true, runValidators: true });
        if (!product)
            throw new Error("Variant not found");
        return product;
    }
    static async deleteVariant(productId, variantId) {
        const product = await Product.findOneAndUpdate({ _id: productId }, { $pull: { variants: { _id: variantId } } }, { new: true });
        if (!product)
            throw new Error("Product not found");
        return product;
    }
    static async getProductForUser(productId, location) {
        const product = await Product.findById(productId).lean();
        if (!product)
            throw new Error("Product not found");
        const filteredVariants = product.variants.filter((v) => v.location === location);
        return {
            ...product,
            variants: filteredVariants
        };
    }
    static async getProductsByLocation(location) {
        return await Product.find({ "variants.location": location }, { variants: 1, name: 1, categoryName: 1 }).lean();
    }
}
//# sourceMappingURL=product.service.js.map