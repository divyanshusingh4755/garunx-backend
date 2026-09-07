import { type Model, type Types } from "mongoose";
import { Role } from "../types/rbac.js";
export type WallerOwnerRole = Role.USER | Role.COORDINATOR;
export interface IWallet extends Document {
    _id: Types.ObjectId;
    ownerId: Types.ObjectId;
    ownerRole: WallerOwnerRole;
    availableBalance: number;
    reservedBalance: number;
    lifetimeCredits: number;
    lifetimeDebits: number;
    currency: "INR";
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
interface IWallerModel extends Model<IWallet> {
}
export declare const Wallet: IWallerModel;
export {};
//# sourceMappingURL=wallet.model.d.ts.map