import { type Types } from "mongoose";
export interface IGeoPoint {
    type: "Point";
    coordinates: [number, number];
}
export interface ICity {
    name: string;
    country: string;
    stateId: Types.ObjectId;
    image?: string;
    description?: string;
    isActive: boolean;
    location?: IGeoPoint;
    createdAt: Date;
    updatedAt: Date;
}
export declare const City: import("mongoose").Model<ICity, {}, {}, {}, import("mongoose").Document<unknown, {}, ICity, {}, import("mongoose").DefaultSchemaOptions> & ICity & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, ICity>;
//# sourceMappingURL=city.model.d.ts.map