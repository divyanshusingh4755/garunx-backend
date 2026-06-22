import { Document } from "mongoose";
export interface IBanner extends Document {
    version: number;
    name: string;
    placement: string;
    format: string;
    isActive: boolean;
    images: string[];
    displayOrder: number;
}
export declare const Banner: import("mongoose").Model<IBanner, {}, {}, {}, Document<unknown, {}, IBanner, {}, import("mongoose").DefaultSchemaOptions> & IBanner & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IBanner>;
//# sourceMappingURL=banner.model.d.ts.map