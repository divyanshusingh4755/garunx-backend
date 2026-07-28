import { Types } from "mongoose";

import { Location } from "../models/location.model.js";
import { State } from "../models/state.model.js";
import { taxConfig } from "../config/tax.config.js";

export interface ITaxContext {
  supplierStateCode: string;
  placeOfSupplyStateCode: string;
}

export class TaxContextService {
  static async resolveByLocationId(
    locationId: string | Types.ObjectId,
  ): Promise<ITaxContext> {
    const id = locationId.toString();

    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid locationId");
    }

    if (!taxConfig.enabled) {
      throw new Error("GST is disabled");
    }

    if (!taxConfig.supplierStateCode) {
      throw new Error(
        "Supplier GST state code is not configured",
      );
    }

    const location = await Location.findById(id)
      .select("stateId isActive")
      .lean();

    if (!location) {
      throw new Error("Location not found");
    }

    if (!location.isActive) {
      throw new Error("Location is inactive");
    }

    if (!location.stateId) {
      throw new Error(
        "State is not configured for this location",
      );
    }

    const state = await State.findById(
      location.stateId,
    )
      .select("gstCode isActive name")
      .lean();

    if (!state) {
      throw new Error(
        "State not found for this location",
      );
    }

    if (!state.isActive) {
      throw new Error(
        "State configured for this location is inactive",
      );
    }

    if (!state.gstCode) {
      throw new Error(
        `GST code is missing for state ${state.name}`,
      );
    }

    if (!/^\d{2}$/.test(state.gstCode)) {
      throw new Error(
        `Invalid GST code configured for state ${state.name}`,
      );
    }

    return {
      supplierStateCode:
        taxConfig.supplierStateCode,

      placeOfSupplyStateCode:
        state.gstCode,
    };
  }
}