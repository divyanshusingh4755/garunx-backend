import { type Document, Types } from "mongoose";
export interface ICity extends Document {
    name: string;
    country: string;
    stateId: Types.ObjectId;
    image?: string;
    description?: string;
    isActive: boolean;
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