export interface ICounter extends Document {
    id: string;
    seq: number;
}
export declare const Counter: import("mongoose").Model<ICounter, {}, {}, {}, import("mongoose").Document<unknown, {}, ICounter, {}, import("mongoose").DefaultSchemaOptions> & ICounter & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any, ICounter>;
//# sourceMappingURL=counter.model.d.ts.map