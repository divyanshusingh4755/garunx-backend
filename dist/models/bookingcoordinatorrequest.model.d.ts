import { Model, Types, type Document } from "mongoose";
export type CoordinatorRequestStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "AUTO_CLOSED" | "CANCELLED";
export type CoordinatorRequestType = "INITIAL_ASSIGNMENT" | "REASSIGNMENT" | "AUTO_ASSIGNMENT";
export interface IBookingCoordinatorRequest extends Document {
    bookingId: Types.ObjectId;
    coordinatorId: Types.ObjectId;
    requestType: CoordinatorRequestType;
    priorityOrder: number;
    status: CoordinatorRequestStatus;
    requestedAt: Date;
    expiresAt: Date;
    respondedAt?: Date;
    responseReason?: string;
    notificationSent: boolean;
    notificationSentAt?: Date;
    metadata?: {
        requestedBy?: Types.ObjectId;
        autoAssignmentRule?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface BookingCoordinatorRequestModel extends Model<IBookingCoordinatorRequest> {
    expirePendingRequests(): Promise<void>;
}
export declare const BookingCoordinatorRequestModel: BookingCoordinatorRequestModel;
//# sourceMappingURL=bookingcoordinatorrequest.model.d.ts.map