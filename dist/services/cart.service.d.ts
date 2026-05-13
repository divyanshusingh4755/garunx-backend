import mongoose, { type ClientSession } from "mongoose";
import { type ICart } from "../models/cart.model.js";
import { type IBooking } from "../models/booking.model.js";
interface CreateCartPayload {
    userId?: string;
    cartType?: "SERVICE" | "PACKAGE" | "MIXED";
    scheduledAt?: Date;
}
interface AddServiceEntryPayload {
    serviceId: string;
    tierId: string;
    locationId: string;
    subServiceId?: string;
}
export declare class CartService {
    createCart(payload: CreateCartPayload): Promise<ICart>;
    addServiceEntry(cartId: string, payload: AddServiceEntryPayload): Promise<{
        entryType: string;
        entryId: mongoose.Types.ObjectId;
        serviceConfiguration: {
            serviceId: mongoose.Types.ObjectId;
            serviceSnapshot: {
                name: string;
                shortDescription: string;
                thumbnailImage: string | undefined;
                serviceReference: string;
            };
            serviceRole: string;
            subService: {
                subServiceId: any;
                name: any;
            } | undefined;
            tier: {
                tierId: mongoose.Types.ObjectId;
                name: string;
            };
            location: {
                locationId: mongoose.Types.ObjectId;
                name: string;
            };
            components: {
                componentType: string;
                serviceComponentId: any;
                componentId: any;
                name: any;
                description: any;
                isRequired: any;
                isRemovable: any;
                isBundled: any;
                selected: any;
                selectedItems: never[];
                pricing: {
                    basePrice: any;
                    itemsTotal: number;
                    total: any;
                };
            }[];
            pricing: {
                subtotal: number;
                taxes: number;
                discount: number;
                grandTotal: number;
            };
        };
    }>;
    recalculateCart(cartId: string, session?: mongoose.ClientSession): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    updateComponent(cartId: string, entryId: string, componentId: string, payload: {
        selected?: boolean;
    }): Promise<void>;
    updateComponentItems(cartId: string, entryId: string, componentId: string, selectedItemsPayload: {
        itemId: string;
    }[]): Promise<any>;
    addAddonComponent(cartId: string, entryId: string, payload: {
        componentId: string;
    }): Promise<{
        componentType: string;
        serviceComponentId: undefined;
        componentId: mongoose.Types.ObjectId;
        name: string;
        description: string;
        isRequired: boolean;
        isRemovable: boolean;
        isBundled: boolean;
        selected: boolean;
        selectedItems: never[];
        pricing: {
            basePrice: number;
            itemsTotal: number;
            total: number;
        };
    }>;
    removeAddonComponent(cartId: string, entryId: string, componentId: string): Promise<{
        success: boolean;
        removedComponentId: string;
    }>;
    addAddonService(cartId: string, entryId: string, payload: {
        serviceId: string;
        tierId: string;
        locationId: string;
        subServiceId?: string;
    }): Promise<{
        serviceId: mongoose.Types.ObjectId;
        serviceSnapshot: {
            name: string;
            shortDescription: string;
            thumbnailImage: string | undefined;
            serviceReference: string;
        };
        serviceRole: string;
        subService: {
            subServiceId: string;
        } | undefined;
        tier: {
            tierId: string;
            name: string;
        };
        location: {
            locationId: string;
            name: string;
        };
        components: {
            componentType: string;
            serviceComponentId: any;
            componentId: any;
            name: any;
            description: any;
            isRequired: any;
            isRemovable: boolean;
            isBundled: boolean;
            selected: any;
            selectedItems: never[];
            pricing: {
                basePrice: number;
                itemsTotal: number;
                total: number;
            };
        }[];
        pricing: {
            subtotal: number;
            taxes: number;
            discount: number;
            grandTotal: number;
        };
    }>;
    removeAddonService(cartId: string, entryId: string, serviceId: string): Promise<{
        success: boolean;
        removeServiceId: string;
    }>;
    validateCart(cartId: string, session?: ClientSession): Promise<{
        isValid: boolean;
        hasPricingChanged: boolean;
        unavailableServices: boolean;
        unavailableComponents: boolean;
        errors: string[];
        lastValidatedAt?: Date;
    }>;
    private validateServiceConfiguration;
    prepareCheckout(cartId: string, userId: string, session?: ClientSession): Promise<{
        cartId: mongoose.Types.ObjectId;
        cartType: "SERVICE" | "PACKAGE" | "MIXED";
        entriesCount: number;
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
        customerDetails: {
            name?: string;
            email?: string;
            phone?: string;
            address?: string;
            caste?: string;
            gotra?: string;
        };
        scheduledAt: Date | undefined;
        notes: string | undefined;
        readyForCheckout: boolean;
        preparedAt: Date;
    }>;
    checkoutCart(cartId: string, userId: string): Promise<{
        success: boolean;
        booking: (mongoose.Document<unknown, {}, IBooking, {}, mongoose.DefaultSchemaOptions> & IBooking & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        }) | undefined;
        paymentRequired: boolean;
    }>;
    deleteCart(cartId: string, userId: string): Promise<{
        success: boolean;
    }>;
    updateCart(cartId: string, userId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    getCartById(cartId: string, userId: string): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    clearCartEntries(cartId: string, userId: string): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    getEntryById(cartId: string, entryId: string, userId: string): Promise<any>;
    private buildServiceConfiguration;
    addPackageEntry(cartId: string, userId: string, payload: {
        packageId: string;
        services: {
            serviceId: string;
            tierId?: string;
            locationId: string;
            subServiceId?: string;
        }[];
    }): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    private resolveCartType;
    removeEntry(cartId: string, entryId: string, userId: string): Promise<{
        success: boolean;
        removedEntryId: string;
        removedEntryType: any;
    }>;
    updateEntry(cartId: string, entryId: string, userId: string, payload: {
        tierId?: string;
        locationId?: string;
        subServiceId?: string;
    }): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    getEntryComponents(cartId: string, entryId: string, userId: string, serviceId?: string): Promise<{
        serviceId: any;
        serviceName: any;
        serviceRole: any;
        components: any;
    }>;
    updateIncludedService(cartId: string, entryId: string, serviceId: string, userId: string, payload: {
        tierId?: string;
        locationId?: string;
        subServiceId?: string;
    }): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    getUserCarts(userId: string, options?: {
        status?: "ACTIVE" | "CHECKED_OUT" | "EXPIRED" | "ABANDONED";
        cartType?: "SERVICE" | "PACKAGE" | "MIXED";
        searchTerm?: string;
        limit?: number;
        page?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: (ICart & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
export {};
//# sourceMappingURL=cart.service.d.ts.map