import { Document, Model, Types } from "mongoose";
type EntryType = "SERVICE" | "PACKAGE";
type ComponentType = "DEFAULT" | "ADDON";
type ServiceRole = "PRIMARY" | "INCLUDED" | "ADDON";
type CartType = "SERVICE" | "PACKAGE" | "MIXED";
interface ISelectedItem {
    itemId: Types.ObjectId;
    name: string;
    price?: number;
}
interface ICartComponent {
    componentType: ComponentType;
    serviceComponentId?: Types.ObjectId;
    componentId: Types.ObjectId;
    name: string;
    description?: string;
    isRequired: boolean;
    isRemovable: boolean;
    isBundled: boolean;
    selected: boolean;
    selectedItems: ISelectedItem[];
    pricing: {
        basePrice: number;
        itemsTotal: number;
        total: number;
    };
}
interface IPackageConfiguration {
    packageId: Types.ObjectId;
    packageSnapshot: {
        name: string;
        shortDescription?: string;
        thumbnailImage?: string;
        packageReference?: string;
    };
    services: IServiceConfiguration[];
    addonServices: IServiceConfiguration[];
    pricing: {
        subtotal: number;
        taxes: number;
        discount: number;
        grandTotal: number;
    };
}
interface IServiceConfiguration {
    serviceId: Types.ObjectId;
    serviceSnapshot: {
        name: string;
        shortDescription?: string;
        thumbnailImage?: string;
        serviceReference?: string;
    };
    serviceRole: ServiceRole;
    subService?: {
        subServiceId: Types.ObjectId;
        name: string;
    };
    tier: {
        tierId: Types.ObjectId;
        name: string;
    };
    location: {
        locationId: Types.ObjectId;
        name: string;
    };
    components: ICartComponent[];
    pricing: {
        subtotal: number;
        taxes: number;
        discount: number;
        grandTotal: number;
    };
}
interface ICartEntry {
    entryType: EntryType;
    entryId: Types.ObjectId;
    serviceConfiguration?: IServiceConfiguration;
    packageConfiguration?: IPackageConfiguration;
}
export interface ICart extends Document {
    userId?: Types.ObjectId;
    customerDetails: {
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
        caste?: string;
        gotra?: string;
    };
    cartType: CartType;
    scheduledAt?: Date;
    notes?: string;
    entries: ICartEntry[];
    pricing: {
        subtotal: number;
        taxes: number;
        discount: number;
        grandTotal: number;
        calculatedAt?: Date;
    };
    validation: {
        isValid: boolean;
        hasPricingChanged: boolean;
        unavailableServices: boolean;
        unavailableComponents: boolean;
        errors: string[];
        lastValidatedAt?: Date;
    };
    status: "ACTIVE" | "CHECKED_OUT" | "EXPIRED" | "ABANDONED";
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Cart: Model<ICart>;
export {};
//# sourceMappingURL=cart.model.d.ts.map