import type { Request, Response } from "express";
export declare class CartController {
    private cartService;
    constructor();
    syncCart: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getCartDetails: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    mergeCartOnLogin: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    addItem: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    removeItem: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    clearCart: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    removeVariant: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getCartCount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    updateItem: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getCart: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getCartItemByTargetId: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    validateCart: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    prepareCheckout: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    updateCustomerDetails: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=cart.controllers.d.ts.map