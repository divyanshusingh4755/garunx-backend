import { Types } from "mongoose";
import { Product, type IProduct } from "../models/product.model.js"

export class ProductService {
	static async createProduct(payload: Partial<IProduct>) {
		try {
			if (!payload.name) throw new Error("Product name is required")

			if (!payload.variants || payload.variants.length === 0) {
				throw new Error("At least one variant is required")
			}

			payload.variants = payload.variants.map(v => ({
				...v,
				tier: v.tier.toLowerCase(),
				location: v.location.toLowerCase()
			}))

			const product = await Product.create(payload);
			return product
		} catch (error: any) {
			if (error.code === 11000) {
				throw new Error("Product already exists")
			}
			throw new Error(error.message || "Failed to create product")
		}
	}

	static async updateProduct(productId: string, updateData: Partial<IProduct>) {
		try {
			const product = await Product.findById(productId)
			if (!product) throw new Error("Product not found")

			const allowedFields = [
				"name",
				"description",
				"imageUrl",
				"adminNotes",
				"categoryName",
				"isActive"
			]

			for (const key of allowedFields) {
				if (updateData[key as keyof IProduct] !== undefined) {
					(product as any)[key] = updateData[key as keyof IProduct]
				}
			}

			if (updateData.variants) {
				for (const incomingVariant of updateData.variants) {
					if (incomingVariant._id) {
						const existing = product.variants.find(v => v._id.equals(incomingVariant._id))

						if (!existing) continue

						if (!incomingVariant.tier !== undefined)
							existing.tier = incomingVariant.tier.toLowerCase();

						if (incomingVariant.location !== undefined)
							existing.location = incomingVariant.location.toLowerCase();

						if (incomingVariant.price !== undefined)
							existing.price = incomingVariant.price;

						if (incomingVariant.description !== undefined)
							existing.description = incomingVariant.description;

						if (incomingVariant.isActive !== undefined)
							existing.isActive = incomingVariant.isActive;
					} else {
						product.variants.push({
							...incomingVariant,
							tier: incomingVariant.tier?.toLowerCase(),
							location: incomingVariant.location?.toLowerCase()
						} as any)
					}
				}
			}

			await product.save()
			return product;
		} catch (error: any) {
			throw new Error(error.message || "Failed to update product")
		}
	}

	static async updateProductStatus(productId: string, isActive: boolean) {
		const product = await Product.findById(productId);
		if (!product) throw new Error("Product not found");

		product.isActive = isActive;

		if (!isActive) {
			product.variants.forEach(v => {
				v.isActive = false;
			});
		}

		await product.save()

		return {
			success: true,
			message: `Product ${isActive ? "activated" : "deactivated"} successfully`
		};
	}

	static async getProductById(productId: string) {
		const product = await Product.findById(productId).lean();
		if (!product) throw new Error("Product not found")

		return product
	}

	static async FindProducts(
		searchTerm?: string,
		categoryFilter?: string,
		locationFilter?: string,
		tierFilter?: string,
		limit: number = 20,
		page: number = 1,
		isRemovable?: boolean,
		isActive: boolean = true,
		sortBy: string = 'createdAt',
		sortOrder: 'asc' | 'desc' = 'desc'
	) {
		const skip = (page - 1) * limit;

		const query: any = {
			isActive
		};

		if (typeof isRemovable === 'boolean') {
			query.isRemovable = isRemovable;
		}

		if (searchTerm) query.$text = { $search: searchTerm };
		if (categoryFilter) query.categoryName = categoryFilter;

		if (locationFilter || tierFilter) {
			query.variants = {
				$elemMatch: {
					...(locationFilter && { location: locationFilter }),
					...(tierFilter && { tier: tierFilter })
				}
			};
		}

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
			const [products, total] = await Promise.all([
				Product.find(query, projection)
					.sort(sortCriteria)
					.skip(skip)
					.limit(limit)
					.lean(),

				Product.countDocuments(query)
			]);

			const cleanedProducts = products
				.map(product => {
					let variants = product.variants.filter((v: any) => v.isActive);

					if (locationFilter) {
						variants = variants.filter(
							(v: any) =>
								v.location.toLowerCase() === locationFilter.toLowerCase()
						);
					}

					if (tierFilter) {
						variants = variants.filter(
							(v: any) =>
								v.tier.toLowerCase() === tierFilter.toLowerCase()
						);
					}

					return {
						...product,
						variants
					};
				})
				.filter(product => product.variants.length > 0);

			return {
				data: cleanedProducts,
				total,
				page,
				totalPages: Math.ceil(total / limit)
			};
		} catch (error: any) {
			throw new Error(`Product fetch failed: ${error.message}`);
		}
	}


	static async addVariant(
		productId: string,
		variant: {
			location: string;
			tier: string;
			price: number;
			description?: string;
		}
	) {

		if (variant.price < 0) throw new Error("Invalid price");

		const product = await Product.findById(productId);
		if (!product) throw new Error("Product not found");

		const exists = product.variants.some(
			v =>
				v.location.toLowerCase() === variant.location.toLowerCase() &&
				v.tier.toLowerCase() === variant.tier.toLowerCase()
		);

		if (exists) {
			throw new Error("Variant already exists for this location and tier");
		}

		product.variants.push({
			...variant,
			isActive: true
		} as any);

		await product.save();

		return product;
	}

	static async updateVariant(
		productId: string,
		variantId: string,
		updateData: any
	) {
		const product = await Product.findById(productId);
		if (!product) throw new Error("Product not found");

		const variant = product.variants.find(v => v._id.equals(variantId));
		if (!variant) throw new Error("Variant not found");

		const newLocation = updateData.location
			? updateData.location.toLowerCase()
			: variant.location;

		const newTier = updateData.tier
			? updateData.tier.toLowerCase()
			: variant.tier;

		const duplicate = product.variants.some(v =>
			v._id.toString() !== variantId &&
			v.location === newLocation &&
			v.tier === newTier
		);

		if (duplicate) {
			throw new Error("Variant with same location and tier already exists");
		}

		if (updateData.location) variant.location = newLocation;
		if (updateData.tier) variant.tier = newTier;
		if (updateData.price !== undefined) variant.price = updateData.price;
		if (updateData.description !== undefined) variant.description = updateData.description;
		if (updateData.isActive !== undefined) variant.isActive = updateData.isActive;

		await product.save();

		return product;
	}

	static async toggleVariantStatus(
		productId: string,
		variantId: string,
		isActive: boolean
	) {
		const product = await Product.findOne({
			_id: productId,
			"variants._id": variantId
		});

		if (!product) throw new Error("Variant not found");

		const variant = product.variants.find(v => v._id.equals(variantId));
		if (!variant) throw new Error("Variant not found");

		if (isActive && !product.isActive) {
			throw new Error("Cannot activate variant of inactive product");
		}

		variant.isActive = isActive;

		await product.save();

		return {
			success: true,
			message: `Variant ${isActive ? "activated" : "deactivated"} successfully`
		};
	}

	static async getProductForUser(productId: string, location: string) {
		const product = await Product.findOne({
			_id: productId,
			isActive: true
		}).lean();

		if (!product) throw new Error("Product not found");

		const filteredVariants = product.variants.filter(
			(v: any) =>
				v.isActive &&
				v.location.toLowerCase() === location.toLowerCase()
		);

		if (filteredVariants.length === 0) {
			throw new Error("No variants available for this location");
		}

		return {
			_id: product._id,
			name: product.name,
			categoryName: product.categoryName,
			isRemovable: product.isRemovable,
			variants: filteredVariants
		};
	}

	static async getProductsByLocation(location: string) {
		const products = await Product.find({
			isActive: true,
			variants: {
				$elemMatch: {
					location: location,
					isActive: true
				}
			}
		})
			.select("name categoryName isRemovable variants")
			.lean();

		const cleanedProducts = products
			.map(product => {
				const variants = product.variants.filter(
					(v: any) =>
						v.isActive &&
						v.location.toLowerCase() === location.toLowerCase()
				);

				return {
					_id: product._id,
					name: product.name,
					categoryName: product.categoryName,
					isRemovable: product.isRemovable,
					variants
				};
			})
			.filter(p => p.variants.length > 0);

		return cleanedProducts;
	}

	static async getVariantsByLocationFromId(variantId: string) {
		const objectId = new Types.ObjectId(variantId);

		const result = await Product.aggregate([
			{
				$match: {
					isActive: true,
					"variants._id": objectId
				}
			},
			{
				$addFields: {
					targetVariant: {
						$arrayElemAt: [
							{
								$filter: {
									input: "$variants",
									as: "v",
									cond: { $eq: ["$$v._id", objectId] }
								}
							},
							0
						]
					}
				}
			},
			{
				$project: {
					name: 1,
					categoryName: 1,
					isRemovable: 1,
					variants: {
						$filter: {
							input: "$variants",
							as: "v",
							cond: {
								$and: [
									{ $eq: ["$$v.location", "$targetVariant.location"] },
									{ $eq: ["$$v.isActive", true] }
								]
							}
						}
					}
				}
			}
		]);

		if (!result.length) {
			throw new Error("Variant not found");
		}

		return result[0];
	}
}