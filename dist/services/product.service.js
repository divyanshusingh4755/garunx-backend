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
    static async getAllProducts(page = 1, limit = 20, filters) {
        const skip = (page - 1) * limit;
        const query = {};
        if (filters.categoryName) {
            query.categoryName = filters.categoryName;
        }
        if (filters.location) {
            query["variants.location"] = filters.location;
        }
        if (filters.tier) {
            query["variants.tier"] = filters.tier;
        }
        const [products, total] = await Promise.all([
            Product.find(query)
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(query)
        ]);
        return {
            products,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
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
        return await Product.find({ "variants.location": location }, { "variants.$": 1, name: 1, categoryName: 1 }).lean();
    }
}
//# sourceMappingURL=product.service.js.map