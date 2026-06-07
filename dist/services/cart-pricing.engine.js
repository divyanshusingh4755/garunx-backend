import { ServicePricing } from "../models/servicepricing.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { ComponentItem } from "../models/componentitem.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { PackageTierMap } from "../models/packagetiermap.model.js";
export class CartPricingEngine {
    static async calculateServiceCart(cart) {
        const [serviceComponents, pricingRows] = await Promise.all([
            ServiceComponent.find({
                serviceId: cart.serviceId,
                tierId: cart.tierId,
            }).lean(),
            ServicePricing.find({
                serviceId: cart.serviceId,
                tierId: cart.tierId,
                locationId: cart.locationId,
            }).lean(),
        ]);
        const pricingMap = new Map(pricingRows.map((p) => [`${p.componentId.toString()}`, p.price]));
        const requiredComponentIds = serviceComponents
            .filter((c) => c.isRequired)
            .map((c) => c.componentId.toString());
        let basePrice = 0;
        for (const componentId of requiredComponentIds) {
            basePrice += pricingMap.get(componentId) || 0;
        }
        let addonPrice = 0;
        for (const comp of cart.selectedComponents || []) {
            const id = comp.componentId.toString();
            if (requiredComponentIds.includes(id))
                continue;
            addonPrice += pricingMap.get(id) || 0;
        }
        for (const comp of cart.addonComponents || []) {
            addonPrice += pricingMap.get(comp.componentId.toString()) || 0;
        }
        const itemIds = [
            ...(cart.selectedComponents || []),
            ...(cart.addonComponents || []),
        ].flatMap((c) => (c.items || []).map((i) => i.itemId));
        const items = await ComponentItem.find({
            _id: { $in: itemIds },
        }).lean();
        const itemMap = new Map(items.map((i) => [i._id.toString(), i.price]));
        let itemAddonPrice = 0;
        for (const comp of [
            ...(cart.selectedComponents || []),
            ...(cart.addonComponents || []),
        ]) {
            for (const item of comp.items || []) {
                itemAddonPrice += itemMap.get(item.itemId.toString()) || 0;
            }
        }
        addonPrice += itemAddonPrice;
        return {
            basePrice,
            addonPrice,
            totalAmount: basePrice + addonPrice,
        };
    }
    static async calculatePackageCart(cart) {
        const [packageTierMap, pricingRows] = await Promise.all([
            PackageTierMap.findOne({
                packageId: cart.packageId,
                tierId: cart.tierId,
            }).lean(),
            PackageTierPricing.find({
                packageId: cart.packageId,
                tierId: cart.tierId,
                locationId: cart.locationId,
            }).lean(),
        ]);
        const pricingMap = new Map(pricingRows.map((p) => [p.serviceId.toString(), p.finalPrice]));
        const allowedServices = packageTierMap?.services || [];
        const selectedServiceIds = new Set((cart.addonServices || []).map((s) => String(s.serviceId)));
        let basePrice = 0;
        for (const serviceId of selectedServiceIds) {
            if (allowedServices.some((s) => s.serviceId.toString() === serviceId)) {
                basePrice += pricingMap.get(serviceId) || 0;
            }
        }
        let addonPrice = 0;
        for (const serviceId of selectedServiceIds) {
            if (!allowedServices.some((s) => s.serviceId.toString() === serviceId)) {
                addonPrice += pricingMap.get(serviceId) || 0;
            }
        }
        return {
            basePrice,
            addonPrice,
            totalAmount: basePrice + addonPrice,
        };
    }
    static async calculateCartTotals(cart) {
        if (cart.serviceId) {
            return this.calculateServiceCart(cart);
        }
        if (cart.packageId) {
            return this.calculatePackageCart(cart);
        }
        return {
            basePrice: 0,
            addonPrice: 0,
            totalAmount: 0,
        };
    }
}
//# sourceMappingURL=cart-pricing.engine.js.map