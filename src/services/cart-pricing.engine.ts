import { ServicePricing } from "../models/servicepricing.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { ComponentItem } from "../models/componentitem.model.js";

export class CartPricingEngine {
  static async getServiceBasePrice(
    serviceId: any,
    tierId: any,
    locationId: any,
  ) {
    const pricingList = await ServicePricing.find({
      serviceId,
      tierId,
      locationId,
    }).lean();

    const basePrice = pricingList.reduce((sum, p) => sum + (p.price || 0), 0);
    return basePrice;
  }

  static async getPackageBasePrice(
    packageId: any,
    tierId: any,
    locationId: any,
  ) {
    const pricingList = await PackageTierPricing.find({
      packageId,
      tierId,
      locationId,
    }).lean();

    const total = pricingList.reduce((sum, p) => sum + (p.finalPrice || 0), 0);
    return total;
  }

  static async calculateComponentTotal(selectedComponents: any[] = []) {
    if (!selectedComponents.length) return 0;

    const itemIds = selectedComponents.flatMap((c) =>
      c.items.map((i: any) => i.itemId),
    );

    if (!itemIds.length) return 0;

    const items = await ComponentItem.find({
      _id: { $in: itemIds },
    }).lean();

    const map = new Map(items.map((i) => [i._id.toString(), i]));

    return selectedComponents.reduce((sum, comp) => {
      const compTotal = (comp.items || []).reduce((s: number, item: any) => {
        return s + (map.get(item.itemId.toString())?.price ?? 0);
      }, 0);

      return sum + compTotal;
    }, 0);
  }

  static async calculateAddonServicesTotal(
    addonServices: any[] = [],
    tierId: any,
    locationId: any,
  ) {
    if (!addonServices.length) return 0;

    const serviceIds = addonServices.map((s) => s.serviceId);

    const pricingList = await ServicePricing.find({
      serviceId: { $in: serviceIds },
      tierId,
      locationId,
    }).lean();

    const priceMap = new Map(
      pricingList.map((p) => [p.serviceId.toString(), p.price]),
    );

    return addonServices.reduce((sum, s) => {
      return sum + (priceMap.get(s.serviceId.toString()) ?? 0);
    }, 0);
  }

  static async calculateCartTotals(cart: any) {
    let basePrice = 0;
    let addonPrice = 0;

    if (cart.serviceId) {
      const servicePricing = await ServicePricing.find({
        serviceId: cart.serviceId,
        tierId: cart.tierId,
        locationId: cart.locationId,
      }).lean();

      basePrice = servicePricing.reduce((sum, p) => sum + (p.price || 0), 0);

      const componentTotal = await this.calculateComponentTotal([
        ...(cart.selectedComponents || []),
        ...(cart.addonComponents || []),
      ]);

      addonPrice = componentTotal;
    }

    if (cart.packageId) {
      const packagePricing = await PackageTierPricing.find({
        packageId: cart.packageId,
        tierId: cart.tierId,
        locationId: cart.locationId,
      }).lean();

      basePrice = packagePricing.reduce(
        (sum, p) => sum + (p.finalPrice || 0),
        0,
      );

      addonPrice = await this.calculateAddonServicesTotal(
        cart.addonServices || [],
        cart.tierId,
        cart.locationId,
      );
    }

    return {
      basePrice,
      addonPrice,
      totalAmount: basePrice + addonPrice,
    };
  }
}
