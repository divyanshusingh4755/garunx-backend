import type { Request } from "express";
export interface CartOwner {
    userId?: string;
    guestId?: string;
}
export declare const getCartOwner: (req: Request) => CartOwner;
export declare const buildCartOwnerQuery: (owner: CartOwner) => {
    userId: string;
    guestId?: never;
} | {
    guestId: string;
    userId?: never;
};
//# sourceMappingURL=getCartOwner.d.ts.map