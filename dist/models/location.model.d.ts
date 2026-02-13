import { type Document, Types } from 'mongoose';
export interface ILocation extends Document {
    name: String;
    country: String;
    state: String;
    city: String;
    fullAddress: String;
    pincode: String;
    image?: String;
    description?: String;
    isActive: Boolean;
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