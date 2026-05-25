import mongoose, { Types } from "mongoose";
declare class CartService {
    static createServiceCart(userId: string, payload: any): Promise<mongoose.Document<unknown, {}, import("../models/cart.model.js").ICart, {}, mongoose.DefaultSchemaOptions> & import("../models/cart.model.js").ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static createPackageCart(userId: string, payload: any): Promise<mongoose.Document<unknown, {}, import("../models/cart.model.js").ICart, {}, mongoose.DefaultSchemaOptions> & import("../models/cart.model.js").ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getUserCarts(userId: string): Promise<(mongoose.Document<unknown, {}, import("../models/cart.model.js").ICart, {}, mongoose.DefaultSchemaOptions> & import("../models/cart.model.js").ICart & Required<{
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
        selectedComponents: any[];
        addonComponents: any[];
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
        addonServices?: import("../models/cart.model.js").IAddonService[];
        scheduledDate?: Date;
        scheduledTime?: string;
        notes?: string;
        activeBookingId?: Types.ObjectId;
        basePrice: number;
        addonPrice: number;
        totalAmount: number;
        status: import("../models/cart.model.js").CartStatus;
        expiresAt?: Date;
        createdAt: Date;
        updatedAt: Date;
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
        package: import("../models/package.model.js").IPackage & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        };
        addonServices: import("../models/cart.model.js").IAddonService[];
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
        selectedComponents?: import("../models/cart.model.js").ISelectedComponent[];
        addonComponents?: import("../models/cart.model.js").ISelectedComponent[];
        scheduledDate?: Date;
        scheduledTime?: string;
        notes?: string;
        activeBookingId?: Types.ObjectId;
        basePrice: number;
        addonPrice: number;
        totalAmount: number;
        status: import("../models/cart.model.js").CartStatus;
        expiresAt?: Date;
        createdAt: Date;
        updatedAt: Date;
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
    static updateSelectedComponents(userId: string, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, import("../models/cart.model.js").ICart, {}, mongoose.DefaultSchemaOptions> & import("../models/cart.model.js").ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateAddonComponents(userId: string, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, import("../models/cart.model.js").ICart, {}, mongoose.DefaultSchemaOptions> & import("../models/cart.model.js").ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateAddonServices(userId: string, cartId: string, payload: any): Promise<import("../models/cart.model.js").ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static updateSchedule(userId: string, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, import("../models/cart.model.js").ICart, {}, mongoose.DefaultSchemaOptions> & import("../models/cart.model.js").ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateCustomerDetails(userId: string, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, import("../models/cart.model.js").ICart, {}, mongoose.DefaultSchemaOptions> & import("../models/cart.model.js").ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateCartNotes(userId: string, cartId: string, payload: any): Promise<mongoose.Document<unknown, {}, import("../models/cart.model.js").ICart, {}, mongoose.DefaultSchemaOptions> & import("../models/cart.model.js").ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static recalculateCart(userId: string, cartId: string, session?: mongoose.ClientSession): Promise<mongoose.Document<unknown, {}, import("../models/cart.model.js").ICart, {}, mongoose.DefaultSchemaOptions> & import("../models/cart.model.js").ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static validateCart(userId: string, cartId: string): Promise<{
        isValid: boolean;
        errors: string[];
    }>;
    static checkoutCart(userId: string, cartId: string): Promise<{
        bookingId: Types.ObjectId;
        bookingReference: string;
        totalAmount: number;
    }>;
    static deleteCart(userId: string, cartId: string): Promise<boolean>;
}
export default CartService;
//# sourceMappingURL=cart.service.d.ts.map