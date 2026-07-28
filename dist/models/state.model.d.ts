import { type Document } from "mongoose";
export interface IState extends Document {
    country: string;
    name: string;
    image?: string;
    description?: string;
    isActive: boolean;
    gstCode: string;
    location?: {
        type: "Point";
        coordinates: [number, number];
    };
}
export declare const State: import("mongoose").Model<IState, {}, {}, {}, Document<unknown, {}, IState, {}, import("mongoose").DefaultSchemaOptions> & IState & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IState>;
//# sourceMappingURL=state.model.d.ts.map