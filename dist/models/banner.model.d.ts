import { Document, Types } from "mongoose";
export interface IBanner extends Document {
    version: number;
    name: string;
    description: string;
    buttonText?: string;
    placement: "HOME_TOP" | "HOME_MIDDLE" | "HOME_BOTTOM" | "CATEGORY" | "PRODUCT";
    format: "WEB" | "MOBILE" | "BOTH";
    isActive: boolean;
    image: string;
    displayOrder: number;
    redirect: {
        type: "NONE" | "SERVICE" | "PACKAGE" | "CATEGORY" | "PRODUCT" | "URL";
        refId?: Types.ObjectId;
        url?: string;
    };
}
export declare const Banner: import("mongoose").Model<IBanner, {}, {}, {}, Document<unknown, {}, IBanner, {}, import("mongoose").DefaultSchemaOptions> & IBanner & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IBanner>;
//# sourceMappingURL=banner.model.d.ts.map