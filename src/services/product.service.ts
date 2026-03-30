import {Product, type IProduct} from "../models/product.model.js"

export class ProductService {
	static async createProduct(payload: Partial<IProduct>) {
		try{
			const product = await Product.create(payload);
			return product
		}catch(error: any){
			if (error.code === 11000){
				throw new Error("Product already exists")
			}
			throw new Error(error.message || "Failed to create product")
		}
	}

	static async updateProduct(productId: string, updateData: Partial<IProduct>){
		try{
			const product = await Product.findByIdAndUpdate(
				productId as string,
				{$set: updateData},
				{new: true, runValidators: true}
				)
			if (!product) throw new Error("Product not found")

			return product;
		}catch(error: any){
			throw new Error(error.message || "Failed to update product")
		}
	}

	static async deleteProduct(productId: string){
		const product = await Product.findByIdAndDelete(productId);
		if(!product) throw new Error("Product not found");

		return {success: true};
	}

	static async getProductById(productId: string){
		const product = await Product.findById(productId).lean();
		if(!product) throw new Error("Product not found")

		return product
	}

	static async getAllProducts(
		page: number = 1,
		limit: number = 20,
		filters: {
			categoryName?: string;
			location?: string;
			tier?: string;
		}
		){
		const skip = (page - 1) * limit
		const query: any = {}
		if (filters.categoryName){
			query.categoryName = filters.categoryName
		}

		if (filters.location){
			query["variants.location"] = filters.location
		}

		if (filters.tier) {
			query["variants.tier"] = filters.tier
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
		}
	}

	static async addVariant(productId: string, variant: {
		location: string;
		tier: string;
		price: number;
		description?: string;
	}) {
		const product = await Product.findByIdAndUpdate(
			productId,
			{$push: {variants: variant}},
			{new: true, runValidators: true}
			);
		if(!product) throw new Error("Product not found");

		return product;
	}

	static async updateVariant(
		productId: string,
		variantId: string,
		updateData: any
		) {

		const updateFields: any = {};
    	
    	for (const key in updateData) {
        	if (key !== '_id') {
        		updateFields[`variants.$.${key}`] = updateData[key];
    		}
    	}

	    const product = await Product.findOneAndUpdate(
    	    { _id: productId, "variants._id": variantId },
        	{ $set: updateFields },
        	{ new: true, runValidators: true }
    	);

		
		if (!product) throw new Error("Variant not found")
		return product;
	}

	static async deleteVariant(productId: string, variantId: string) {
		const product = await Product.findOneAndUpdate (
			{_id: productId},
			{$pull: {variants: {_id: variantId}}},
			{new: true}
			);

		if (!product) throw new Error("Product not found")

		return product;
	}

	static async getProductForUser(productId: string, location: string){
		const product = await Product.findById(productId).lean();
		if(!product) throw new Error("Product not found")

		const filteredVariants = product.variants.filter(
			v => v.location === location
			);

	return {
		...product,
		variants: filteredVariants
	}
	}

	static async getProductsByLocation(location: string) {
    return await Product.find(
        { "variants.location": location },
        { "variants.$": 1, name: 1, categoryName: 1 }
    ).lean();
	}
}