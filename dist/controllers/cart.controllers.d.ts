import type { Request, Response } from "express";
export declare class CartController {
    private cartService;
    constructor();
    createCart: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getUserCarts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getCartById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    updateCart: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    deleteCart: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    clearCartEntries: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    addServiceEntry: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    addPackageEntry: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getEntryById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    updateEntry: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    removeEntry: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getEntryComponents: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    updateComponent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    updateComponentItems: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    addAddonComponent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    removeAddonComponent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    addAddonService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    removeAddonService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    updateIncludedService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    validateCart: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    recalculateCart: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    prepareCheckout: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    checkoutCart: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=cart.controllers.d.ts.map