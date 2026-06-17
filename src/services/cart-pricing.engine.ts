import { ServicePricing } from "../models/servicepricing.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { ComponentItem } from "../models/componentitem.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { PackageTierMap } from "../models/packagetiermap.model.js";

export class CartPricingEngine {
  static async calculateServiceCart(cart: any) {
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

    const pricingMap = new Map(
      pricingRows.map((p) => [`${p.componentId.toString()}`, p.price]),
    );

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
      if (requiredComponentIds.includes(id)) continue;
      basePrice += pricingMap.get(id) || 0;
    }

    for (const comp of cart.addonComponents || []) {
      addonPrice += pricingMap.get(comp.componentId.toString()) || 0;
    }

    const itemIds = [
      ...(cart.selectedComponents || []),
      ...(cart.addonComponents || []),
    ].flatMap((c) => (c.items || []).map((i: any) => i.itemId));

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

  static async calculatePackageCart(cart: any) {
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

    const pricingMap = new Map(
      pricingRows.map((p) => [p.serviceId.toString(), p.finalPrice]),
    );

    const allowedServices = packageTierMap?.services || [];

    const selectedServiceIds = new Set(
      (cart.selectedServices || []).map((s: any) => String(s.serviceId)),
    );

    const addonServiceIds = new Set(
      (cart.addonServices || []).map((s: any) => String(s.serviceId)),
    );

    let basePrice = 0;
    let addonPrice = 0;

    for (const service of allowedServices) {
      const serviceId = service.serviceId.toString();
      const price = pricingMap.get(serviceId) || 0;

      const isSelected = selectedServiceIds.has(serviceId);
      const isAddon = addonServiceIds.has(serviceId);

      if (isSelected && service.isRequired) {
        basePrice += price;
      }

      if (isAddon && !service.isRequired) {
        addonPrice += price;
      }
    }

    return {
      basePrice,
      addonPrice,
      totalAmount: basePrice + addonPrice,
    };
  }

  static async calculateCartTotals(cart: any) {
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
