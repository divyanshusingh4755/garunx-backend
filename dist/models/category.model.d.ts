export interface ICategory extends Document {
    label: string;
    value: string;
    type: "service" | "product";
    image?: string;
    description?: string;
    isActive: boolean;
    displayOrder: number;
}
export declare const Category: import("mongoose").Model<ICategory, {}, {}, {}, import("mongoose").Document<unknown, {}, ICategory, {}, import("mongoose").DefaultSchemaOptions> & ICategory & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, ICategory>;
//# sourceMappingURL=category.model.d.ts.map