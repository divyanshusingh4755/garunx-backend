import { Types } from "mongoose";
export declare class ServiceComponentService {
    static bulkUpsertComponents(payload: any): Promise<{
        success: boolean;
        message: string;
    }>;
    static replaceComponents(payload: any): Promise<{
        success: boolean;
        message: string;
    }>;
    static getComponentsByServiceAndTier(serviceId: string, tierId: string): Promise<{
        componentId: Types.ObjectId;
        name: string;
        isRequired: boolean;
        items: {
            itemId: Types.ObjectId;
            name: string;
        }[];
    }[]>;
    static patchComponent(payload: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=servicecomponent.service.d.ts.map