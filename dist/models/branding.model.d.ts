export interface IBrand extends Document {
    version: number;
    isActive: boolean;
    theme: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
}
export declare const Branding: import("mongoose").Model<IBrand, {}, {}, {}, import("mongoose").Document<unknown, {}, IBrand, {}, import("mongoose").DefaultSchemaOptions> & IBrand & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IBrand>;
//# sourceMappingURL=branding.model.d.ts.map