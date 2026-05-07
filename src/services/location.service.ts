import { Types } from "mongoose";
import { Location, type ILocation } from "../models/location.model.js";
import type { QueryFilter } from "mongoose";

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
    location?: {
      type: "Point";
      coordinates: [number, number];
    };
  }) {
    const newLocation = new Location(data);
    return await newLocation.save();
  }

  private static applyFilter(filterValue?: string) {
    if (!filterValue) return undefined;
    const values = filterValue.split(",").map((val) => val.trim());
    return { $in: values };
  }

  static async FindLocation(params: {
    searchTerm?: string;
    countryFilter?: string;
    stateIdFilter?: string;
    cityIdFilter?: string;
    pincodeFilter?: string;
    limit?: number;
    page?: number;
    isActive?: boolean | undefined;
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

    const skip = limit * (page - 1);
    const query: any = {};

    if (typeof isActive === "boolean") {
      query.isActive = isActive;
    }

    if (searchTerm) query.$text = { $search: searchTerm };
    if (countryFilter) query.country = this.applyFilter(countryFilter);
    if (stateIdFilter) query.stateId = this.applyFilter(stateIdFilter);
    if (cityIdFilter) query.cityId = this.applyFilter(cityIdFilter);
    if (pincodeFilter) query.pincode = this.applyFilter(pincodeFilter);

    let sortCriteria: any = {};
    if (searchTerm && sortBy === "relevance") {
      sortCriteria = { score: { $meta: "textScore" } };
    } else {
      sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
      if (sortBy !== "createdAt") sortCriteria["createdAt"] = -1;
    }

    try {
      const [data, total] = await Promise.all([
        Location.find(query)
          .populate("stateId", "name")
          .populate("cityId", "name")
          .sort(sortCriteria)
          .skip(skip)
          .limit(limit)
          .lean(),

        Location.countDocuments(query),
      ]);

      const formattedData = data.map((loc: any) => ({
        id: loc._id,
        name: loc.name,
        country: loc.country,

        state: {
          id: loc.stateId?._id,
          name: loc.stateId?.name,
        },

        city: {
          id: loc.cityId?._id,
          name: loc.cityId?.name,
        },

        pincode: loc.pincode,
        fullAddress: loc.fullAddress,
        isActive: loc.isActive,
        image: loc.image,
        description: loc.description,
        location: loc.location,
      }));

      return {
        data: formattedData,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new Error(`Location fetched failed: ${error.message}`);
    }
  }

  static async updateLocation(
    locationId: string,
    updateData: {
      name?: string;
      country?: string;
      stateId?: string;
      cityId?: string;
      fullAddress?: string;
      pincode?: string;
      image?: string;
      description?: string;
      location?: {
        type: "Point";
        coordinates: [number, number];
      };
      isActive?: boolean;
    },
  ) {
    try {
      const updatedLocation = await Location.findByIdAndUpdate(
        locationId,
        { $set: updateData },
        { new: true, runValidators: true },
      ).lean();

      if (!updatedLocation) {
        throw new Error("Location not found");
      }

      return updatedLocation;
    } catch (error: any) {
      throw new Error(`Location Update Failed: ${error.message}`);
    }
  }

  static async softDeleteLocation(locationId: string, status: string) {
    try {
      const deletedLocation = await Location.findByIdAndUpdate(
        locationId,
        { isActive: status },
        { new: true, runValidators: true },
      ).lean();

      if (!deletedLocation) throw new Error("Location not found");
      return deletedLocation;
    } catch (error: any) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  static async getLocationById(locationId: string) {
    try {
      const location = await Location.findById(locationId).lean().exec();
      if (!location) {
        const error = new Error("Location not found");
        (error as any).statusCode = 404;
        throw error;
      }
      return location;
    } catch (error: any) {
      throw new Error(`Failed to get location: ${error.message}`);
    }
  }

  static async getLocationByIds(locationIds: string[]) {
    try {
      const validIds = locationIds.filter((id) => Types.ObjectId.isValid(id));

      if (validIds.length === 0) {
        throw new Error("No valid location IDs provided");
      }

      const locations = await Location.find({
        _id: { $in: validIds },
      })
        .populate("stateId", "name")
        .populate("cityId", "name")
        .lean()
        .exec();

      if (!locations || locations.length === 0) {
        const error = new Error("Locations not found");
        (error as any).statusCode = 404;
        throw error;
      }

      const formattedData = locations.map((loc: any) => ({
        id: loc._id,
        name: loc.name,
        country: loc.country,

        state: {
          id: loc.stateId?._id,
          name: loc.stateId?.name,
        },

        city: {
          id: loc.cityId?._id,
          name: loc.cityId?.name,
        },

        pincode: loc.pincode,
        fullAddress: loc.fullAddress,
        isActive: loc.isActive,
        image: loc.image,
        description: loc.description,
        location: loc.location,
      }));

      return formattedData;
    } catch (error: any) {
      throw new Error(`Failed to get locations: ${error.message}`);
    }
  }
}
