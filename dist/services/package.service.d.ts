import { type IPackage } from "../models/package.model.js";
export declare class PackageService {
    static create(data: Partial<IPackage>): Promise<(import("mongoose").Document<unknown, {}, IPackage, {}, import("mongoose").DefaultSchemaOptions> & IPackage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    static fetchByLocation(locationIds: any): Promise<(import("mongoose").Document<unknown, {}, IPackage, {}, import("mongoose").DefaultSchemaOptions> & IPackage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    })[]>;
    static findById(id: string): Promise<(import("mongoose").Document<unknown, {}, IPackage, {}, import("mongoose").DefaultSchemaOptions> & IPackage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    static update(id: string, data: Partial<IPackage>): Promise<(import("mongoose").Document<unknown, {}, IPackage, {}, import("mongoose").DefaultSchemaOptions> & IPackage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    static toggleStatus(id: string, status: boolean): Promise<(import("mongoose").Document<unknown, {}, IPackage, {}, import("mongoose").DefaultSchemaOptions> & IPackage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    static getAllPackages(): Promise<(import("mongoose").Document<unknown, {}, IPackage, {}, import("mongoose").DefaultSchemaOptions> & IPackage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    })[]>;
}
//# sourceMappingURL=package.service.d.ts.map