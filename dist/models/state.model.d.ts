export interface IGeoPoint {
    type: "Point";
    coordinates: [number, number];
}
export interface IState {
    country: string;
    name: string;
    image?: string;
    description?: string;
    isActive: boolean;
    gstCode: string;
    location?: IGeoPoint;
    createdAt: Date;
    updatedAt: Date;
}
export declare const State: import("mongoose").Model<IState, {}, {}, {}, import("mongoose").Document<unknown, {}, IState, {}, import("mongoose").DefaultSchemaOptions> & IState & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IState>;
//# sourceMappingURL=state.model.d.ts.map