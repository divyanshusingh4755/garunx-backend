export interface ITier {
    name: string;
    tierReference: string;
    isActive: boolean;
}
export declare const Tier: import("mongoose").Model<ITier, {}, {}, {}, import("mongoose").Document<unknown, {}, ITier, {}, import("mongoose").DefaultSchemaOptions> & ITier & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, ITier>;
//# sourceMappingURL=tier.model.d.ts.map