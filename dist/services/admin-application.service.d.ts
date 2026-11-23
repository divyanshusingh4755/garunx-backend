import { Types } from "mongoose";
export declare class AdminApplicationService {
    static submit(input: {
        fullName: string;
        email: string;
        phoneNumber?: string;
        password: string;
    }): Promise<{
        applicationId: string;
        status: "PENDING" | "APPROVED" | "REJECTED";
    }>;
    static list(status?: string): Promise<({
        status: "PENDING" | "APPROVED" | "REJECTED";
        email: string;
        fullName: string;
        passwordHash: string;
        phoneNumber?: string | null;
        decidedAt?: NativeDate | null;
        decidedBy?: Types.ObjectId | null;
        adminId?: Types.ObjectId | null;
        createdAt: NativeDate;
        updatedAt: NativeDate;
    } & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>)[]>;
    static decide(applicationId: string, adminId: string, decision: "APPROVED" | "REJECTED"): Promise<{
        applicationId: string;
        status: "APPROVED" | "REJECTED";
        adminId: string | null;
    }>;
}
//# sourceMappingURL=admin-application.service.d.ts.map