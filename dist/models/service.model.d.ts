import { Types, Document } from "mongoose";
export interface ISubServiceVariant {
    variantId: Types.ObjectId;
    displayOrder?: number;
    isOptional?: boolean;
    isEditable?: boolean;
}
interface ISubService {
    _id: Types.ObjectId;
    name: string;
    description?: string;
    displayOrder: number;
    variants: ISubServiceVariant[];
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