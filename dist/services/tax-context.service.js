import { Types, } from "mongoose";
import { Location, } from "../models/location.model.js";
import { State, } from "../models/state.model.js";
import { taxConfig, } from "../config/tax.config.js";
export class TaxContextService {
    static normalizeStateCode(fieldName, value) {
        if (typeof value !== "string") {
            throw new Error(`${fieldName} must be a string`);
        }
        const normalized = value.trim();
        if (!/^\d{2}$/.test(normalized)) {
            throw new Error(`${fieldName} must contain exactly two digits`);
        }
        return normalized;
    }
    static async resolveByLocationId(locationId) {
        const id = locationId.toString();
        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid locationId");
        }
        if (!taxConfig.enabled) {
            throw new Error("GST is disabled");
        }
        const supplierStateCode = this.normalizeStateCode("Supplier GST state code", taxConfig.supplierStateCode);
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
            throw new Error("State is not configured for this location");
        }
        const state = await State.findById(location.stateId)
            .select("gstCode isActive name")
            .lean();
        if (!state) {
            throw new Error("State not found for this location");
        }
        if (!state.isActive) {
            throw new Error("State configured for this location is inactive");
        }
        const stateName = state.name ??
            "selected state";
        let placeOfSupplyStateCode;
        try {
            placeOfSupplyStateCode =
                this.normalizeStateCode("State GST code", state.gstCode);
        }
        catch {
            throw new Error(`Invalid or missing GST code configured for state ${stateName}`);
        }
        return {
            supplierStateCode,
            placeOfSupplyStateCode,
        };
    }
}
//# sourceMappingURL=tax-context.service.js.map