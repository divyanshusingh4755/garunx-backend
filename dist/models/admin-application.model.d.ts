import { Schema, type InferSchemaType } from "mongoose";
declare const adminApplicationSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    status: "PENDING" | "APPROVED" | "REJECTED";
    email: string;
    fullName: string;
    passwordHash: string;
    phoneNumber?: string | null;
    decidedAt?: NativeDate | null;
    decidedBy?: import("mongoose").Types.ObjectId | null;
    adminId?: import("mongoose").Types.ObjectId | null;
} & import("mongoose").DefaultTimestampProps, import("mongoose").Document<unknown, {}, {
    status: "PENDING" | "APPROVED" | "REJECTED";
    email: string;
    fullName: string;
    passwordHash: string;
    phoneNumber?: string | null;
    decidedAt?: NativeDate | null;
    decidedBy?: import("mongoose").Types.ObjectId | null;
    adminId?: import("mongoose").Types.ObjectId | null;
} & import("mongoose").DefaultTimestampProps, {
    id: string;
}, Omit<import("mongoose").DefaultSchemaOptions, "timestamps"> & {
    timestamps: true;
}> & Omit<{
    status: "PENDING" | "APPROVED" | "REJECTED";
    email: string;
    fullName: string;
    passwordHash: string;
    phoneNumber?: string | null;
    decidedAt?: NativeDate | null;
    decidedBy?: import("mongoose").Types.ObjectId | null;
    adminId?: import("mongoose").Types.ObjectId | null;
} & import("mongoose").DefaultTimestampProps & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, unknown, {
    status: "PENDING" | "APPROVED" | "REJECTED";
    email: string;
    fullName: string;
    passwordHash: string;
    phoneNumber?: string | null;
    decidedAt?: NativeDate | null;
    decidedBy?: import("mongoose").Types.ObjectId | null;
    adminId?: import("mongoose").Types.ObjectId | null;
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export type IAdminApplication = InferSchemaType<typeof adminApplicationSchema>;
export declare const AdminApplication: import("mongoose").Model<{
    status: "PENDING" | "APPROVED" | "REJECTED";
    email: string;
    fullName: string;
    passwordHash: string;
    phoneNumber?: string | null;
    decidedAt?: NativeDate | null;
    decidedBy?: import("mongoose").Types.ObjectId | null;
    adminId?: import("mongoose").Types.ObjectId | null;
} & import("mongoose").DefaultTimestampProps, {}, {}, {
    id: string;
}, import("mongoose").Document<unknown, {}, {
    status: "PENDING" | "APPROVED" | "REJECTED";
    email: string;
    fullName: string;
    passwordHash: string;
    phoneNumber?: string | null;
    decidedAt?: NativeDate | null;
    decidedBy?: import("mongoose").Types.ObjectId | null;
    adminId?: import("mongoose").Types.ObjectId | null;
} & import("mongoose").DefaultTimestampProps, {
    id: string;
}, {
    timestamps: true;
}> & Omit<{
    status: "PENDING" | "APPROVED" | "REJECTED";
    email: string;
    fullName: string;
    passwordHash: string;
    phoneNumber?: string | null;
    decidedAt?: NativeDate | null;
    decidedBy?: import("mongoose").Types.ObjectId | null;
    adminId?: import("mongoose").Types.ObjectId | null;
} & import("mongoose").DefaultTimestampProps & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    status: "PENDING" | "APPROVED" | "REJECTED";
    email: string;
    fullName: string;
    passwordHash: string;
    phoneNumber?: string | null;
    decidedAt?: NativeDate | null;
    decidedBy?: import("mongoose").Types.ObjectId | null;
    adminId?: import("mongoose").Types.ObjectId | null;
} & import("mongoose").DefaultTimestampProps, import("mongoose").Document<unknown, {}, {
    status: "PENDING" | "APPROVED" | "REJECTED";
    email: string;
    fullName: string;
    passwordHash: string;
    phoneNumber?: string | null;
    decidedAt?: NativeDate | null;
    decidedBy?: import("mongoose").Types.ObjectId | null;
    adminId?: import("mongoose").Types.ObjectId | null;
} & import("mongoose").DefaultTimestampProps, {
    id: string;
}, Omit<import("mongoose").DefaultSchemaOptions, "timestamps"> & {
    timestamps: true;
}> & Omit<{
    status: "PENDING" | "APPROVED" | "REJECTED";
    email: string;
    fullName: string;
    passwordHash: string;
    phoneNumber?: string | null;
    decidedAt?: NativeDate | null;
    decidedBy?: import("mongoose").Types.ObjectId | null;
    adminId?: import("mongoose").Types.ObjectId | null;
} & import("mongoose").DefaultTimestampProps & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, unknown, {
    status: "PENDING" | "APPROVED" | "REJECTED";
    email: string;
    fullName: string;
    passwordHash: string;
    phoneNumber?: string | null;
    decidedAt?: NativeDate | null;
    decidedBy?: import("mongoose").Types.ObjectId | null;
    adminId?: import("mongoose").Types.ObjectId | null;
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>, {
    status: "PENDING" | "APPROVED" | "REJECTED";
    email: string;
    fullName: string;
    passwordHash: string;
    phoneNumber?: string | null;
    decidedAt?: NativeDate | null;
    decidedBy?: import("mongoose").Types.ObjectId | null;
    adminId?: import("mongoose").Types.ObjectId | null;
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export {};
//# sourceMappingURL=admin-application.model.d.ts.map