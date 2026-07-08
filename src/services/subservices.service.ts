import {
  SubServiceComponent,
  type ISubServiceComponent,
} from "../models/subservices.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";

export class SubServiceComponentService {
  private static applyFilter(filterValue?: string) {
    if (!filterValue) return undefined;

    const values = filterValue.split(",").map((val) => val.trim());

    return { $in: values };
  }

  static async createSubServiceComponent(
    name: string,
    description: string,
    serviceId: string,
    image?: string,
    isActive?: boolean,
  ) {
    const newSubServiceComponent = new SubServiceComponent({
      name,
      description,
      serviceId,
      image,
      isActive,
    });

    return await newSubServiceComponent.save();
  }

  static async findSubServiceComponents(
    searchTerm?: string,
    serviceId?: string,
    limit: number = 40,
    page: number = 1,
    isActive?: boolean,
    sortBy: string = "createdAt",
    sortOrder: "asc" | "desc" = "desc",
  ) {
    const skip = limit * (page - 1);

    const query: any = {};

    if (typeof isActive === "boolean") {
      query.isActive = isActive;
    }

    if (serviceId) {
      query.serviceId = this.applyFilter(serviceId);
    }

    const isTextSearch =
      !!searchTerm?.trim() && searchTerm.trim().length >= 3;

    if (searchTerm?.trim()) {
      const term = searchTerm.trim();

      if (isTextSearch) {
        query.$text = {
          $search: term,
        };
      } else {
        query.name = {
          $regex: `^${escapeRegex(term)}`,
          $options: "i",
        };
      }
    }

    let sortCriteria: any = {};

    if (isTextSearch && sortBy === "relevance") {
      sortCriteria = {
        score: {
          $meta: "textScore",
        },
      };
    } else {
      sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;

      if (sortBy !== "createdAt") {
        sortCriteria.createdAt = -1;
      }
    }

    let projection: any = {};

    if (isTextSearch && sortBy === "relevance") {
      projection = {
        score: {
          $meta: "textScore",
        },
      };
    }

    try {
      const [data, total] = await Promise.all([
        SubServiceComponent.find(query, projection)
          .populate("serviceId")
          .sort(sortCriteria)
          .skip(skip)
          .limit(limit)
          .lean(),

        SubServiceComponent.countDocuments(query),
      ]);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new Error(`Sub Service Component fetch failed: ${error.message}`);
    }
  }

  static async updateSubServiceComponent(
    subServiceComponentId: string,
    updateData: Partial<ISubServiceComponent>,
  ) {
    try {
      const updatedSubServiceComponent =
        await SubServiceComponent.findByIdAndUpdate(
          subServiceComponentId,
          { $set: updateData },
          { new: true, runValidators: true },
        )
          .populate("serviceId")
          .lean();

      if (!updatedSubServiceComponent) {
        throw new Error("Sub Service Component not found");
      }

      return updatedSubServiceComponent;
    } catch (error: any) {
      throw new Error(`Sub Service Component Update Failed: ${error.message}`);
    }
  }

  static async toggleSubServiceComponent(
    subServiceComponentId: string,
    status: boolean,
  ) {
    try {
      const updatedSubServiceComponent =
        await SubServiceComponent.findByIdAndUpdate(
          subServiceComponentId,
          { isActive: status },
          { new: true, runValidators: true },
        )
          .populate("serviceId")
          .lean();

      if (!updatedSubServiceComponent) {
        throw new Error("Sub Service Component not found");
      }

      return updatedSubServiceComponent;
    } catch (error: any) {
      throw new Error(`Toggle failed: ${error.message}`);
    }
  }

  static async getSubServiceComponentById(subServiceComponentId: string) {
    try {
      const subServiceComponent = await SubServiceComponent.findById(
        subServiceComponentId,
      )
        .populate("serviceId")
        .lean()
        .exec();

      if (!subServiceComponent) {
        const error = new Error("Sub Service Component not found");
        (error as any).statusCode = 404;
        throw error;
      }

      return subServiceComponent;
    } catch (error: any) {
      throw new Error(`Failed to get Sub Service Component: ${error.message}`);
    }
  }
}
