import { type Document } from "mongoose";
export interface ICounter extends Document {
    id: string;
    seq: number;
}
export declare const Counter: import("mongoose").Model<ICounter, {}, {}, {}, Document<unknown, {}, ICounter, {}, import("mongoose").DefaultSchemaOptions> & ICounter & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any, ICounter>;
//# sourceMappingURL=counter.model.d.ts.map