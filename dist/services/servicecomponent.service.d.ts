import { Types } from "mongoose";
import { type IServiceComponentItem } from "../models/servicecomponent.model.js";
type ComponentInput = {
    componentId: string;
    isRequired?: boolean;
    items?: Array<string | {
        itemId: string;
    }>;
};
type ComponentPayload = {
    serviceId: string;
    tierId: string;
    components: ComponentInput[];
};
type PatchPayload = {
    serviceId: string;
    tierId: string;
    componentId: string;
    isRequired?: boolean;
    items?: Array<string | {
        itemId: string;
    }>;
};
export declare class ServiceComponentService {
    private static invalidateServiceComponentCache;
    private static normalizeItemIds;
    private static validateServiceTier;
    private static prepareComponents;
    static bulkUpsertComponents(payload: ComponentPayload): Promise<{
        success: boolean;
        message: string;
    }>;
    static replaceComponents(payload: ComponentPayload): Promise<{
        success: boolean;
        message: string;
    }>;
    static getComponentsByServiceAndTier(serviceId: string, tierId: string): Promise<{
        componentId: Types.ObjectId;
        name: string;
        description: string;
        isRequired: boolean;
        items: IServiceComponentItem[];
    }[]>;
    static patchComponent(payload: PatchPayload): Promise<{
        success: boolean;
        message: string;
        component: import("../models/servicecomponent.model.js").IServiceComponent & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        };
    }>;
}
export {};
//# sourceMappingURL=servicecomponent.service.d.ts.map