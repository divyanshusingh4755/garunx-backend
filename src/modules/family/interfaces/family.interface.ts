import {Document, Types} from "mongoose";
import { FamilyStatus } from "../enums/family-status.enum.js";
import { FamilyVisibility } from "../enums/family-visibility.enum.js";

export interface IFamilySettings {
    allowInvites: boolean;
    allowMemberEdit: boolean;
    showLivingOnly: boolean;
}

export interface IFamily extends Document {
    name: string;
    description?: string;
    ownerId: Types.ObjectId;
    rootMemberId?: Types.ObjectId;
    coverPhoto?: string;
    familyPhoto?: string;
    memberCount: number;
    visibility: FamilyVisibility;
    settings: IFamilySettings;
    status: FamilyStatus;
    createdAt: Date;
    updatedAt: Date;
}