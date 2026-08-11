import mongoose, { Types, type QueryFilter, type SortOrder } from "mongoose";
import {
  Location,
  type ILocation,
  type IGeoPoint,
} from "../models/location.model.js";
import { Service } from "../models/service.model.js";
import { Package } from "../models/package.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";

type LocationUpdate = Partial<
  Pick<
    ILocation,
    | "name"
    | "country"
    | "fullAddress"
    | "pincode"
    | "image"
    | "description"
    | "isActive"
    | "location"
  >
> & {
  stateId?: string;
  cityId?: string;
};

const createHttpError = (message: string, statusCode: number) => {
  const error = new Error(message) as Error & {
    statusCode: number;
  };

  error.statusCode = statusCode;
  return error;
};

export class LocationService {
  static async createLocation(data: {
    name: string;
    country: string;
    stateId: string;
    cityId: string;
    fullAddress: string;
    pincode: string;
    image?: string;
    description?: string;
    location?: IGeoPoint;
  }) {
    return Location.create(data);
  }

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

  static async findLocation(params: {
    searchTerm?: string;
    countryFilter?: string;
    stateIdFilter?: string;
    cityIdFilter?: string;
    pincodeFilter?: string;
    limit?: number;
    page?: number;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const {
      searchTerm,
      countryFilter,
      stateIdFilter,
      cityIdFilter,
      pincodeFilter,
      limit = 40,
      page = 1,
      isActive,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = safeLimit * (safePage - 1);

    const query: QueryFilter<ILocation> = {};

    if (typeof isActive === "boolean") {
      query.isActive = isActive;
    }

    const countryQuery = this.applyStringFilter(countryFilter);
    const stateQuery = this.applyObjectIdFilter(stateIdFilter);
    const cityQuery = this.applyObjectIdFilter(cityIdFilter);
    const pincodeQuery = this.applyStringFilter(pincodeFilter);

    if (countryQuery) query.country = countryQuery;
    if (stateQuery) query.stateId = stateQuery;
    if (cityQuery) query.cityId = cityQuery;
    if (pincodeQuery) query.pincode = pincodeQuery;

    const term = searchTerm?.trim();
    const isTextSearch = Boolean(term && term.length > 4);

    if (term) {
      if (isTextSearch) {
        query.$text = { $search: term };
      } else {
        query.$or = [
          {
            name: {
              $regex: `^${escapeRegex(term)}`,
              $options: "i",
            },
          },
          {
            pincode: {
              $regex: `^${escapeRegex(term)}`,
            },
          },
        ];
      }
    }

    const allowedSortFields = new Set([
      "name",
      "country",
      "pincode",
      "createdAt",
      "updatedAt",
    ]);

    let sortCriteria: Record<string, SortOrder | { $meta: "textScore" }>;

    if (isTextSearch && sortBy === "relevance") {
      sortCriteria = {
        score: { $meta: "textScore" },
      };
    } else {
      const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "createdAt";

      sortCriteria = {
        [safeSortBy]: sortOrder === "asc" ? 1 : -1,
      };

      if (safeSortBy !== "createdAt") {
        sortCriteria.createdAt = -1;
      }
    }

    const [data, total] = await Promise.all([
      Location.find(query)
        .populate("stateId", "name")
        .populate("cityId", "name")
        .sort(sortCriteria)
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      Location.countDocuments(query),
    ]);

    const formattedData = data.map((location: any) => ({
      id: location._id,
      name: location.name,
      country: location.country,
      state: {
        id: location.stateId?._id,
        name: location.stateId?.name,
      },
      city: {
        id: location.cityId?._id,
        name: location.cityId?.name,
      },
      pincode: location.pincode,
      fullAddress: location.fullAddress,
      isActive: location.isActive,
      image: location.image,
      description: location.description,
      location: location.location,
    }));

    return {
      data: formattedData,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  static async updateLocation(locationId: string, updateData: LocationUpdate) {
    const updatedLocation = await Location.findByIdAndUpdate(
      locationId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!updatedLocation) {
      throw createHttpError("Location not found", 404);
    }

    return updatedLocation;
  }

  static async getDeactivationImpact(locationId: string) {
    const targetId = new Types.ObjectId(locationId);

    const linkedLocationQuery = {
      locations: {
        $elemMatch: {
          locationId: targetId,
          isActive: true,
        },
      },
    };

    const [services, packages] = await Promise.all([
      Service.find(linkedLocationQuery, {
        _id: 1,
        name: 1,
      }).lean(),

      Package.find(linkedLocationQuery, {
        _id: 1,
        name: 1,
      }).lean(),
    ]);

    return {
      servicesCount: services.length,
      packagesCount: packages.length,
      services,
      packages,
    };
  }

  static async softDeleteLocation(
    locationId: string,
    status: boolean,
    confirmed = false,
  ) {
    const location = await Location.findById(locationId)
      .select("_id isActive")
      .lean();

    if (!location) {
      throw createHttpError("Location not found", 404);
    }

    if (location.isActive === status) {
      return {
        success: true,
        unchanged: true,
      };
    }

    if (!status && !confirmed) {
      const impact = await this.getDeactivationImpact(locationId);

      if (impact.servicesCount > 0 || impact.packagesCount > 0) {
        return {
          requiresConfirmation: true,
          impact,
        };
      }
    }

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const updatedLocation = await Location.findByIdAndUpdate(
        locationId,
        { $set: { isActive: status } },
        {
          new: true,
          session,
        },
      ).lean();

      if (!updatedLocation) {
        throw createHttpError("Location not found", 404);
      }

      if (!status) {
        const targetId = new Types.ObjectId(locationId);

        const updatePayload = {
          $set: {
            "locations.$[loc].isActive": false,
          },
        };

        const options = {
          session,
          arrayFilters: [
            {
              "loc.locationId": targetId,
              "loc.isActive": true,
            },
          ],
        };

        await Promise.all([
          Service.updateMany(
            {
              locations: {
                $elemMatch: {
                  locationId: targetId,
                  isActive: true,
                },
              },
            },
            updatePayload,
            options,
          ),

          Package.updateMany(
            {
              locations: {
                $elemMatch: {
                  locationId: targetId,
                  isActive: true,
                },
              },
            },
            updatePayload,
            options,
          ),
        ]);
      }

      await session.commitTransaction();

      return {
        success: true,
        location: updatedLocation,
      };
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  static async getLocationById(locationId: string) {
    const location = await Location.findById(locationId)
      .populate("stateId", "name")
      .populate("cityId", "name")
      .lean();

    if (!location) {
      throw createHttpError("Location not found", 404);
    }

    return location;
  }

  static async getLocationByIds(locationIds: string[]) {
    const objectIds = locationIds.map((id) => new Types.ObjectId(id));

    const locations = await Location.find({
      _id: { $in: objectIds },
    })
      .populate("stateId", "name")
      .populate("cityId", "name")
      .lean();

    if (locations.length === 0) {
      throw createHttpError("Locations not found", 404);
    }

    return locations.map((location: any) => ({
      id: location._id,
      name: location.name,
      country: location.country,
      state: {
        id: location.stateId?._id,
        name: location.stateId?.name,
      },
      city: {
        id: location.cityId?._id,
        name: location.cityId?.name,
      },
      pincode: location.pincode,
      fullAddress: location.fullAddress,
      isActive: location.isActive,
      image: location.image,
      description: location.description,
      location: location.location,
    }));
  }
}
