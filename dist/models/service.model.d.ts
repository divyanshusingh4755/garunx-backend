import { Types, Document } from "mongoose";
export interface ILocationService {
    name: string;
    isActive: boolean;
    locationId: Types.ObjectId;
}
export interface IServiceTier {
    name: string;
    tierId: Types.ObjectId;
}
export interface IService extends Document {
    name: string;
    shortDescription: string;
    fullDescription?: string;
    categoryId: Types.ObjectId;
    thumbnailImage?: string;
    bannerImage?: string;
    isActive: boolean;
    serviceReference: string;
    locations: ILocationService[];
    tiers: IServiceTier[];
    isComplete: boolean;
}
export declare const Service: import("mongoose").Model<IService, {}, {}, {}, Document<unknown, {}, IService, {}, import("mongoose").DefaultSchemaOptions> & IService & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IService>;
//# sourceMappingURL=service.model.d.ts.map