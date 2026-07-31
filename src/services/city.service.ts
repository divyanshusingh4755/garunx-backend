import {
  Types,
  type QueryFilter,
  type SortOrder,
} from "mongoose";
import {
  City,
  type ICity,
  type IGeoPoint,
} from "../models/city.model.js";
import { State } from "../models/state.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";

type CityUpdate = Partial<
  Pick<
    ICity,
    | "name"
    | "country"
    | "image"
    | "description"
    | "isActive"
    | "location"
  >
> & {
  stateId?: string;
};

const createHttpError = (
  message: string,
  statusCode: number,
) => {
  const error = new Error(message) as Error & {
    statusCode: number;
  };

  error.statusCode = statusCode;
  return error;
};

export class CityService {
  private static applyStringFilter(
    filterValue?: string,
  ): { $in: string[] } | undefined {
    if (!filterValue?.trim()) return undefined;

    const values = filterValue
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    return values.length > 0 ? { $in: values } : undefined;
  }

  private static applyObjectIdFilter(
    filterValue?: string,
  ): { $in: Types.ObjectId[] } | undefined {
    if (!filterValue?.trim()) return undefined;

    const values = filterValue
      .split(",")
      .map((value) => value.trim())
      .filter((value) => Types.ObjectId.isValid(value))
      .map((value) => new Types.ObjectId(value));

    return values.length > 0 ? { $in: values } : undefined;
  }

  static async createCity(params: {
    name: string;
    country: string;
    stateId: string;
    image?: string;
    description?: string;
    location?: IGeoPoint;
  }) {
    const {
      name,
      country,
      stateId,
      image,
      description,
      location,
    } = params;

    const validState = await State.exists({
      _id: stateId,
      country,
    });

    if (!validState) {
      throw createHttpError(
        "State does not belong to country",
        400,
      );
    }

    return City.create({
      name,
      country,
      stateId,

      ...(image !== undefined && {
        image,
      }),

      ...(description !== undefined && {
        description,
      }),

      ...(location !== undefined && {
        location,
      }),
    });
  }

  static async findCity(params: {
    searchTerm?: string;
    cityFilter?: string;
    stateIdFilter?: string;
    countryFilter?: string;
    limit?: number;
    page?: number;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const {
      searchTerm,
      cityFilter,
      stateIdFilter,
      countryFilter,
      limit = 40,
      page = 1,
      isActive,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const query: QueryFilter<ICity> = {};

    if (typeof isActive === "boolean") {
      query.isActive = isActive;
    }

    const cityQuery =
      this.applyStringFilter(cityFilter);
    const stateQuery =
      this.applyObjectIdFilter(stateIdFilter);
    const countryQuery =
      this.applyStringFilter(countryFilter);

    if (cityQuery) query.name = cityQuery;
    if (stateQuery) query.stateId = stateQuery;
    if (countryQuery) query.country = countryQuery;

    const term = searchTerm?.trim();
    const isTextSearch = Boolean(term && term.length > 4);

    if (term) {
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

    let projection:
      | Record<string, unknown>
      | undefined;

    let sortCriteria: Record<
      string,
      SortOrder | { $meta: "textScore" }
    >;

    if (isTextSearch && sortBy === "relevance") {
      projection = {
        score: {
          $meta: "textScore",
        },
      };

      sortCriteria = {
        score: {
          $meta: "textScore",
        },
      };
    } else {
      const allowedSortFields = new Set([
        "name",
        "country",
        "createdAt",
        "updatedAt",
      ]);

      const safeSortBy = allowedSortFields.has(sortBy)
        ? sortBy
        : "createdAt";

      sortCriteria = {
        [safeSortBy]: sortOrder === "asc" ? 1 : -1,
      };

      if (safeSortBy !== "createdAt") {
        sortCriteria.createdAt = -1;
      }
    }

    const [data, total] = await Promise.all([
      City.find(query, projection)
        .populate("stateId", "name")
        .sort(sortCriteria)
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      City.countDocuments(query),
    ]);

    return {
      data,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  static async updateCity(
    cityId: string,
    updateData: CityUpdate,
  ) {
    const existingCity = await City.findById(cityId)
      .select("country stateId")
      .lean();

    if (!existingCity) {
      throw createHttpError("City not found", 404);
    }

    const country =
      updateData.country ?? existingCity.country;

    const stateId =
      updateData.stateId ??
      existingCity.stateId.toString();

    if (
      updateData.country !== undefined ||
      updateData.stateId !== undefined
    ) {
      const validState = await State.exists({
        _id: stateId,
        country,
      });

      if (!validState) {
        throw createHttpError(
          "State does not belong to country",
          400,
        );
      }
    }

    const updatedCity = await City.findByIdAndUpdate(
      cityId,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("stateId", "name")
      .lean();

    if (!updatedCity) {
      throw createHttpError("City not found", 404);
    }

    return updatedCity;
  }

  static async softDeleteCity(
    cityId: string,
    status: boolean,
  ) {
    const updatedCity = await City.findByIdAndUpdate(
      cityId,
      {
        $set: {
          isActive: status,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!updatedCity) {
      throw createHttpError("City not found", 404);
    }

    return updatedCity;
  }

  static async getCityById(cityId: string) {
    const city = await City.findById(cityId)
      .populate("stateId", "name")
      .lean();

    if (!city) {
      throw createHttpError("City not found", 404);
    }

    return city;
  }
}
