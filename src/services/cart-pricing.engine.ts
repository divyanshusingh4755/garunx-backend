import { ServicePricing } from "../models/servicepricing.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { ComponentItem } from "../models/componentitem.model.js";
import { Service } from "../models/service.model.js";

export class CartPricingEngine {
  static async getServiceBasePrice(
    serviceId: any,
    tierId: any,
    locationId: any,
  ) {
    const pricing = await ServicePricing.findOne({
      serviceId,
      tierId,
      locationId,
    }).lean();

    return pricing?.price ?? 0;
  }

  static async getPackageBasePrice(
    packageId: any,
    tierId: any,
    locationId: any,
  ) {
    const pricing = await PackageTierPricing.findOne({
      packageId,
      tierId,
      locationId,
    }).lean();

    return pricing?.finalPrice ?? 0;
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
      const compTotal = comp.items.reduce((s: number, item: any) => {
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

    const services = await Service.find({
      _id: { $in: serviceIds },
      isActive: true,
    }).lean();

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
    let componentTotal = 0;
    let addonTotal = 0;

    if (cart.serviceId) {
      basePrice = await this.getServiceBasePrice(
        cart.serviceId,
        cart.tierId,
        cart.locationId,
      );

      componentTotal = await this.calculateComponentTotal([
        ...(cart.selectedComponents || []),
        ...(cart.addonComponents || []),
      ]);
    }

    if (cart.packageId) {
      basePrice = await this.getPackageBasePrice(
        cart.packageId,
        cart.tierId,
        cart.locationId,
      );

      addonTotal = await this.calculateAddonServicesTotal(
        cart.addonServices || [],
        cart.tierId,
        cart.locationId,
      );
    }

    return {
      basePrice,
      addonPrice: componentTotal + addonTotal,
      totalAmount: basePrice + componentTotal + addonTotal,
    };
  }
}
