import mongoose, { Types } from "mongoose";
import { type IAddonService, type ICart, type ISelectedComponent, type ISelectedService } from "../models/cart.model.js";
interface CartValidationResult {
    isValid: boolean;
    errors: string[];
    changes: string[];
    cart: ICart;
}
declare class CartService {
    static createServiceCart(userId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static createPackageCart(userId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getUserCarts(userId: string, filters?: any): Promise<(mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    static getCartById(userId: string, cartId: string): Promise<{
        service: import("../models/service.model.js").IService & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        };
        selectedComponents: {
            component: (import("../models/component.model.js").IComponent & Required<{
                _id: Types.ObjectId;
            }> & {
                __v: number;
            }) | undefined;
            items: {
                itemDetails: (import("../models/componentitem.model.js").IComponentItem & Required<{
                    _id: Types.ObjectId;
                }> & {
                    __v: number;
                }) | undefined;
                itemId: Types.ObjectId;
                name: string;
            }[];
            componentId: Types.ObjectId;
            name: string;
            totalPrice: number;
        }[];
        addonComponents: {
            component: (import("../models/component.model.js").IComponent & Required<{
                _id: Types.ObjectId;
            }> & {
                __v: number;
            }) | undefined;
            items: {
                itemDetails: (import("../models/componentitem.model.js").IComponentItem & Required<{
                    _id: Types.ObjectId;
                }> & {
                    __v: number;
                }) | undefined;
                itemId: Types.ObjectId;
                name: string;
            }[];
            componentId: Types.ObjectId;
            name: string;
            totalPrice: number;
        }[];
        _id: Types.ObjectId;
        userId?: Types.ObjectId | null;
        serviceId?: Types.ObjectId;
        packageId?: Types.ObjectId;
        name: string;
        thumbnailImage?: string;
        categoryId: Types.ObjectId;
        tierId: Types.ObjectId;
        tierName: string;
        locationId: Types.ObjectId;
        locationName: string;
        customerDetails?: {
            name?: string;
            email?: string;
            phone?: string;
            address?: string;
            caste?: string;
            gotra?: string;
        };
        selectedServices?: ISelectedService[];
        addonServices?: IAddonService[];
        scheduledDate?: Date;
        scheduledTime?: string;
        notes?: string;
        activeBookingId?: Types.ObjectId;
        basePrice: number;
        addonPrice: number;
        totalAmount: number;
        status: import("../models/cart.model.js").CartStatus;
        createdAt: Date;
        updatedAt: Date;
        checkedOutAt?: Date;
        checkoutExpiresAt?: Date;
        convertedToBookingAt?: Date;
        $locals: Record<string, unknown>;
        $op: "save" | "validate" | "remove" | null;
        $where: Record<string, unknown>;
        baseModelName?: string;
        collection: mongoose.Collection;
        db: mongoose.Connection;
        errors?: mongoose.Error.ValidationError;
        isNew: boolean;
        schema: mongoose.Schema;
        __v: number;
    } | {
        package: any;
        services: {
            components: {
                component: (import("../models/component.model.js").IComponent & Required<{
                    _id: Types.ObjectId;
                }> & {
                    __v: number;
                }) | undefined;
                items: {
                    itemDetails: (import("../models/componentitem.model.js").IComponentItem & Required<{
                        _id: Types.ObjectId;
                    }> & {
                        __v: number;
                    }) | undefined;
                    itemId: Types.ObjectId;
                    name: string;
                }[];
                name: string;
                description: string;
                serviceId: Types.ObjectId;
                componentId: Types.ObjectId;
                tierId: Types.ObjectId;
                isRequired: boolean;
                _id: Types.ObjectId;
                $locals: Record<string, unknown>;
                $op: "save" | "validate" | "remove" | null;
                $where: Record<string, unknown>;
                baseModelName?: string;
                collection: mongoose.Collection;
                db: mongoose.Connection;
                errors?: mongoose.Error.ValidationError;
                isNew: boolean;
                schema: mongoose.Schema;
                __v: number;
            }[];
            name: string;
            shortDescription: string;
            fullDescription: string;
            categoryId: Types.ObjectId;
            thumbnailImage?: string;
            bannerImage?: string;
            isActive: boolean;
            serviceReference: string;
            locations: import("../models/service.model.js").ILocationService[];
            tiers: import("../models/service.model.js").IServiceTier[];
            isComplete: boolean;
            subServiceComponents?: any[];
            _id: Types.ObjectId;
            $locals: Record<string, unknown>;
            $op: "save" | "validate" | "remove" | null;
            $where: Record<string, unknown>;
            baseModelName?: string;
            collection: mongoose.Collection;
            db: mongoose.Connection;
            errors?: mongoose.Error.ValidationError;
            isNew: boolean;
            schema: mongoose.Schema;
            __v: number;
        }[];
        selectedServices: any[];
        addonServices: any[];
        _id: Types.ObjectId;
        userId?: Types.ObjectId | null;
        serviceId?: Types.ObjectId;
        packageId?: Types.ObjectId;
        name: string;
        thumbnailImage?: string;
        categoryId: Types.ObjectId;
        tierId: Types.ObjectId;
        tierName: string;
        locationId: Types.ObjectId;
        locationName: string;
        customerDetails?: {
            name?: string;
            email?: string;
            phone?: string;
            address?: string;
            caste?: string;
            gotra?: string;
        };
        selectedComponents?: ISelectedComponent[];
        addonComponents?: ISelectedComponent[];
        scheduledDate?: Date;
        scheduledTime?: string;
        notes?: string;
        activeBookingId?: Types.ObjectId;
        basePrice: number;
        addonPrice: number;
        totalAmount: number;
        status: import("../models/cart.model.js").CartStatus;
        createdAt: Date;
        updatedAt: Date;
        checkedOutAt?: Date;
        checkoutExpiresAt?: Date;
        convertedToBookingAt?: Date;
        $locals: Record<string, unknown>;
        $op: "save" | "validate" | "remove" | null;
        $where: Record<string, unknown>;
        baseModelName?: string;
        collection: mongoose.Collection;
        db: mongoose.Connection;
        errors?: mongoose.Error.ValidationError;
        isNew: boolean;
        schema: mongoose.Schema;
        __v: number;
    }>;
    static updateSelectedComponents(userId: string, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateAddonComponents(userId: string, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateSelectedServices(userId: string, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateAddonServices(userId: string, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateSchedule(userId: string, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateCustomerDetails(userId: string, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateCartNotes(userId: string, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static recalculateCart(userId: string, cartId: string, options?: {
        session?: mongoose.ClientSession;
        persist?: boolean;
    }): Promise<{
        cart: mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        changes: string[];
    }>;
    static validateCart(userId: string, cartId: string, persist: boolean, session?: mongoose.ClientSession): Promise<CartValidationResult>;
    static checkoutCart(userId: string, cartId: string): Promise<{
        bookingId: Types.ObjectId;
        bookingReference: string;
        totalAmount: number;
        paymentCompleted: boolean;
        paymentSessionId?: never;
    } | {
        bookingId: Types.ObjectId;
        bookingReference: string;
        totalAmount: number;
        paymentSessionId: any;
        paymentCompleted?: never;
    }>;
    static deleteCart(userId: string, cartId: string): Promise<boolean>;
    static expireCheckoutPendingCarts(): Promise<void>;
}
export default CartService;
//# sourceMappingURL=cart.service.d.ts.map