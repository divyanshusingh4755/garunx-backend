import type { Types } from "mongoose";

export enum VerificationStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

export interface IVerification extends Document {
    userId: Types.ObjectId
}