import mongoose, { Types } from "mongoose";
import { type IAddonService, type ICart, type ISelectedComponent, type ISelectedService } from "../models/cart.model.js";
import { type CartOwner } from "../utils/getCartOwner.js";
import type { ILineTax } from "../types/tax.types.js";
interface CartValidationResult {
    isValid: boolean;
    errors: string[];
    changes: string[];
    cart: ICart;
}
declare class CartService {
    private static applyLineTax;
    private static round;
    private static ensureUniqueIds;
    private static clearLineDiscounts;
    private static calculateCouponDiscount;
    private static allocateDiscountToCartLines;
    private static applyPricingResults;
    static ensureCartEditable(cart: ICart): void;
    private static formatCartResponse;
    static createServiceCart(owner: CartOwner, payload: any): Promise<{
        _id: any;
        cartType: string;
        serviceId: any;
        packageId: any;
        name: any;
        thumbnailImage: any;
        categoryId: any;
        tierId: any;
        tierName: any;
        locationId: any;
        locationName: any;
        items: import("./cart-pricing.engine.js").CalculatedComponentItem[] | import("./cart-pricing.engine.js").CalculatedServiceItem[];
        addonComponents: any;
        addonServices: any;
        basePrice: any;
        addonPrice: any;
        subtotal: any;
        discountAmount: any;
        totalAmount: any;
        taxSummary: any;
        coupon: any;
        status: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static createPackageCart(owner: CartOwner, payload: any): Promise<{
        _id: any;
        cartType: string;
        serviceId: any;
        packageId: any;
        name: any;
        thumbnailImage: any;
        categoryId: any;
        tierId: any;
        tierName: any;
        locationId: any;
        locationName: any;
        items: import("./cart-pricing.engine.js").CalculatedComponentItem[] | import("./cart-pricing.engine.js").CalculatedServiceItem[];
        addonComponents: any;
        addonServices: any;
        basePrice: any;
        addonPrice: any;
        subtotal: any;
        discountAmount: any;
        totalAmount: any;
        taxSummary: any;
        coupon: any;
        status: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static getUserCarts(owner: CartOwner, filters?: any): Promise<{
        carts: (mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
    static getCartById(owner: CartOwner, cartId: string): Promise<{
        service: import("../models/service.model.js").IService & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        };
        selectedComponents: {
            component: (import("../models/component.model.js").IComponent & {
                _id: Types.ObjectId;
            } & {
                __v: number;
            }) | undefined;
            items: {
                itemDetails: (import("../models/componentitem.model.js").IComponentItem & {
                    _id: Types.ObjectId;
                } & {
                    __v: number;
                }) | undefined;
                itemId: Types.ObjectId;
                name: string;
            }[];
            componentId: Types.ObjectId;
            name: string;
            priceBeforeDiscount: number;
            discountAmount: number;
            totalPrice: number;
            tax?: ILineTax;
        }[];
        addonComponents: {
            component: (import("../models/component.model.js").IComponent & {
                _id: Types.ObjectId;
            } & {
                __v: number;
            }) | undefined;
            items: {
                itemDetails: (import("../models/componentitem.model.js").IComponentItem & {
                    _id: Types.ObjectId;
                } & {
                    __v: number;
                }) | undefined;
                itemId: Types.ObjectId;
                name: string;
            }[];
            componentId: Types.ObjectId;
            name: string;
            priceBeforeDiscount: number;
            discountAmount: number;
            totalPrice: number;
            tax?: ILineTax;
        }[];
        _id: Types.ObjectId;
        userId?: Types.ObjectId | null;
        guestId?: string;
        serviceId?: Types.ObjectId;
        packageId?: Types.ObjectId;
        couponId?: Types.ObjectId;
        couponCode?: string;
        name: string;
        thumbnailImage?: string;
        categoryId: Types.ObjectId;
        tierId: Types.ObjectId;
        tierName: string;
        locationId: Types.ObjectId;
        locationName: string;
        bookingFor: import("../models/cart.model.js").BookingFor;
        customerDetails?: {
            name?: string;
            email?: string;
            phone?: string;
            address?: string;
            caste?: string;
            gotra?: string;
        };
        selectedServices: ISelectedService[];
        addonServices: IAddonService[];
        scheduledAt?: Date;
        schedulingTimezone?: string;
        notes?: string;
        activeBookingId?: Types.ObjectId;
        basePrice: number;
        addonPrice: number;
        subtotal: number;
        discountAmount: number;
        totalAmount: number;
        taxSummary: import("../models/cart.model.js").ICartTaxSummary;
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
                component: (import("../models/component.model.js").IComponent & {
                    _id: Types.ObjectId;
                } & {
                    __v: number;
                }) | undefined;
                items: {
                    itemDetails: (import("../models/componentitem.model.js").IComponentItem & {
                        _id: Types.ObjectId;
                    } & {
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
                createdAt: Date;
                updatedAt: Date;
                _id: Types.ObjectId;
                __v: number;
            }[];
            name: string;
            shortDescription: string;
            fullDescription: string;
            categoryId: Types.ObjectId;
            thumbnailImage: string;
            bannerImage?: string;
            isActive: boolean;
            serviceReference: string;
            locations: import("../models/service.model.js").ILocationService[];
            tiers: import("../models/service.model.js").IServiceTier[];
            isComplete: boolean;
            startingPrice: number;
            subServiceComponents?: unknown[];
            createdAt: Date;
            updatedAt: Date;
            _id: Types.ObjectId;
            __v: number;
        }[];
        selectedServices: any[];
        addonServices: any[];
        _id: Types.ObjectId;
        userId?: Types.ObjectId | null;
        guestId?: string;
        serviceId?: Types.ObjectId;
        packageId?: Types.ObjectId;
        couponId?: Types.ObjectId;
        couponCode?: string;
        name: string;
        thumbnailImage?: string;
        categoryId: Types.ObjectId;
        tierId: Types.ObjectId;
        tierName: string;
        locationId: Types.ObjectId;
        locationName: string;
        bookingFor: import("../models/cart.model.js").BookingFor;
        customerDetails?: {
            name?: string;
            email?: string;
            phone?: string;
            address?: string;
            caste?: string;
            gotra?: string;
        };
        selectedComponents: ISelectedComponent[];
        addonComponents: ISelectedComponent[];
        scheduledAt?: Date;
        schedulingTimezone?: string;
        notes?: string;
        activeBookingId?: Types.ObjectId;
        basePrice: number;
        addonPrice: number;
        subtotal: number;
        discountAmount: number;
        totalAmount: number;
        taxSummary: import("../models/cart.model.js").ICartTaxSummary;
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
        providerOrderId?: never;
        paymentSessionId?: never;
        reusedPaymentSession?: never;
    } | {
        bookingId: Types.ObjectId;
        bookingReference: string;
        totalAmount: number;
        providerOrderId: any;
        paymentSessionId: any;
        reusedPaymentSession: boolean;
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
    static reopenCart(owner: CartOwner, cartId: string): Promise<mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
}
export default CartService;
//# sourceMappingURL=cart.service.d.ts.map