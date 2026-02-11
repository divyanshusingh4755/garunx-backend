import type { Types } from "mongoose";
export declare enum VerificationStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
export interface IVerification extends Document {
    userId: Types.ObjectId;
}
//# sourceMappingURL=verification.model.d.ts.map