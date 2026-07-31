import { type Document, Types } from "mongoose";
export type BannerPlacement = "HOME_TOP" | "HOME_MIDDLE" | "HOME_BOTTOM" | "CATEGORY" | "PRODUCT";
export type BannerFormat = "WEB" | "MOBILE" | "BOTH";
export type BannerRedirectType = "NONE" | "SERVICE" | "PACKAGE" | "CATEGORY" | "PRODUCT" | "URL";
export interface IBanner extends Document {
    version: number;
    name: string;
    description: string;
    buttonText?: string;
    placement: BannerPlacement;
    format: BannerFormat;
    isActive: boolean;
    image: string;
    displayOrder: number;
    redirect: {
        type: BannerRedirectType;
        refId?: Types.ObjectId;
        url?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const Banner: import("mongoose").Model<IBanner, {}, {}, {}, Document<unknown, {}, IBanner, {}, import("mongoose").DefaultSchemaOptions> & IBanner & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IBanner>;
//# sourceMappingURL=banner.model.d.ts.map