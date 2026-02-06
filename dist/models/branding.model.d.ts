export interface IBrand extends Document {
    version: Number;
    isActive: Boolean;
    theme: {
        primary: String;
        secondary: String;
        accent: String;
        background: String;
        text: String;
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