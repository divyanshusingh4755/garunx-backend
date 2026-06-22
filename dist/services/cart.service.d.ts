import mongoose, { Types } from "mongoose";
import { type IAddonService, type ICart, type ISelectedComponent, type ISelectedService } from "../models/cart.model.js";
import { type CartOwner } from "../utils/getCartOwner.js";
interface CartValidationResult {
    isValid: boolean;
    errors: string[];
    changes: string[];
    cart: ICart;
}
declare class CartService {
    static ensureCartEditable(cart: ICart): void;
    static createServiceCart(owner: CartOwner, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static createPackageCart(owner: CartOwner, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getUserCarts(owner: CartOwner, filters?: any): Promise<(mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    static getCartById(owner: CartOwner, cartId: string): Promise<{
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
        guestId?: string;
        serviceId?: Types.ObjectId;
        packageId?: Types.ObjectId;
        couponId?: Types.ObjectId | undefined;
        couponCode?: string | undefined;
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
        subtotal: number;
        discountAmount: number;
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
        guestId?: string;
        serviceId?: Types.ObjectId;
        packageId?: Types.ObjectId;
        couponId?: Types.ObjectId | undefined;
        couponCode?: string | undefined;
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
        subtotal: number;
        discountAmount: number;
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
    static updateSelectedComponents(owner: CartOwner, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateAddonComponents(owner: CartOwner, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateSelectedServices(owner: CartOwner, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateAddonServices(owner: CartOwner, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateSchedule(owner: CartOwner, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateCustomerDetails(owner: CartOwner, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateCartNotes(owner: CartOwner, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static recalculateCart(owner: CartOwner, cartId: string, options?: {
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
    static validateCart(owner: CartOwner, cartId: string, persist: boolean, session?: mongoose.ClientSession): Promise<CartValidationResult>;
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
    static deleteCart(owner: CartOwner, cartId: string): Promise<boolean>;
    static expireCheckoutPendingCarts(): Promise<void>;
    static mergeGuestCartToUser(guestId: string, userId: string): Promise<void>;
    static applyCoupon(owner: CartOwner, cartId: string, couponCode: string): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static removeCoupon(owner: CartOwner, cartId: string): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
}
export default CartService;
//# sourceMappingURL=cart.service.d.ts.map