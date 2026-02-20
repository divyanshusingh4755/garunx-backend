import { type Document, Types } from 'mongoose';
export interface ICity extends Document {
    city: String;
    state: String;
    image?: String;
    description?: String;
    isActive: Boolean;
    location?: {
        type: "Point";
        coordinates: [number, number];
    };
}
export declare const City: import("mongoose").Model<ICity, {}, {}, {}, Document<unknown, {}, ICity, {}, import("mongoose").DefaultSchemaOptions> & ICity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ICity>;
//# sourceMappingURL=city.model.d.ts.map