export interface IService extends Document {
    name: string;
    description: string;
    category: string;
    image?: string;
    isActive: boolean;
}
export declare const Service: import("mongoose").Model<IService, {}, {}, {}, import("mongoose").Document<unknown, {}, IService, {}, import("mongoose").DefaultSchemaOptions> & IService & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IService>;
//# sourceMappingURL=service.model.d.ts.map