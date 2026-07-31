import { type Types } from "mongoose";
export interface ILocationService {
    name: string;
    isActive: boolean;
    locationId: Types.ObjectId;
}
export interface IServiceTier {
    name: string;
    tierId: Types.ObjectId;
}
export interface IService {
    name: string;
    shortDescription: string;
    fullDescription: string;
    categoryId: Types.ObjectId;
    thumbnailImage: string;
    bannerImage?: string;
    isActive: boolean;
    serviceReference: string;
    locations: ILocationService[];
    tiers: IServiceTier[];
    isComplete: boolean;
    startingPrice: number;
    subServiceComponents?: unknown[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const Service: import("mongoose").Model<IService, {}, {}, {}, import("mongoose").Document<unknown, {}, IService, {}, import("mongoose").DefaultSchemaOptions> & IService & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IService>;
//# sourceMappingURL=service.model.d.ts.map