import type { Request, Response } from "express";
export declare class CartController {
    private cartService;
    constructor();
    syncCart: (req: Request, res: Response) => Promise<void>;
    getCartDetails: (req: Request, res: Response) => Promise<void>;
    megreCartOnLogin: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    addItem: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    removeItem: (req: Request, res: Response) => Promise<void>;
    clearCart: (req: Request, res: Response) => Promise<void>;
    removeVariant: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=cart.controllers.d.ts.map