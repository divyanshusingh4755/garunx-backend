import { Types, Document } from "mongoose";
interface ISubService {
    name: string;
    slug: string;
    description?: string;
    displayOrder: number;
    variantIds: Types.ObjectId[];
}
export interface IService extends Document {
    name: string;
    locations: string[];
    shortDescription: string;
    fullDescription?: string;
    category: string;
    thumbnailImage?: string;
    bannerImage?: string;
    subServices: ISubService[];
    isActive: boolean;
}
export declare const Service: import("mongoose").Model<IService, {}, {}, {}, Document<unknown, {}, IService, {}, import("mongoose").DefaultSchemaOptions> & IService & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IService>;
export {};
//# sourceMappingURL=service.model.d.ts.map