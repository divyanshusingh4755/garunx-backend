export interface IComponentItem {
    name: string;
    price?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ComponentItem: import("mongoose").Model<IComponentItem, {}, {}, {}, import("mongoose").Document<unknown, {}, IComponentItem, {}, import("mongoose").DefaultSchemaOptions> & IComponentItem & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IComponentItem>;
//# sourceMappingURL=componentitem.model.d.ts.map