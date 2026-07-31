import { type Types } from "mongoose";
export interface IGeoPoint {
    type: "Point";
    coordinates: [number, number];
}
export interface ILocation {
    name: string;
    country: string;
    stateId: Types.ObjectId;
    cityId: Types.ObjectId;
    fullAddress: string;
    pincode: string;
    image?: string;
    description?: string;
    isActive: boolean;
    location?: IGeoPoint;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Location: import("mongoose").Model<ILocation, {}, {}, {}, import("mongoose").Document<unknown, {}, ILocation, {}, import("mongoose").DefaultSchemaOptions> & ILocation & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, ILocation>;
//# sourceMappingURL=location.model.d.ts.map