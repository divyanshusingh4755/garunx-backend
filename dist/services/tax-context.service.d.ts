import { Types } from "mongoose";
export interface ITaxContext {
    supplierStateCode: string;
    placeOfSupplyStateCode: string;
}
export declare class TaxContextService {
    private static normalizeStateCode;
    static resolveByLocationId(locationId: string | Types.ObjectId): Promise<ITaxContext>;
}
//# sourceMappingURL=tax-context.service.d.ts.map