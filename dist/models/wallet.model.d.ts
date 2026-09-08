import { Document, type Model, type Types } from "mongoose";
import { Role } from "../types/rbac.js";
export type WalletOwnerRole = Role.USER | Role.COORDINATOR;
export interface IWallet extends Document {
    _id: Types.ObjectId;
    ownerId: Types.ObjectId;
    ownerRole: WalletOwnerRole;
    availableBalance: number;
    reservedBalance: number;
    lifetimeCredits: number;
    lifetimeDebits: number;
    currency: "INR";
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
interface IWalletModel extends Model<IWallet> {
}
export declare const Wallet: IWalletModel;
export {};
//# sourceMappingURL=wallet.model.d.ts.map