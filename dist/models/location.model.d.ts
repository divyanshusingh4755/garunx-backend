import { type Document, Types } from 'mongoose';
export interface ILocation extends Document {
    name: string;
    country: string;
    state: string;
    city: string;
    fullAddress: string;
    pincode: string;
    image?: string;
    description?: string;
    isActive: boolean;
    location?: {
        type: "Point";
        coordinates: [number, number];
    };
}
export declare const Location: import("mongoose").Model<ILocation, {}, {}, {}, Document<unknown, {}, ILocation, {}, import("mongoose").DefaultSchemaOptions> & ILocation & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ILocation>;
//# sourceMappingURL=location.model.d.ts.map