import type { Request } from "express";
export type CartOwner = {
    userId: string;
    guestId?: never;
} | {
    userId?: never;
    guestId: string;
};
export declare const getCartOwner: (req: Request) => CartOwner;
export declare const buildCartOwnerQuery: (owner: CartOwner) => {
    userId: string;
} | {
    guestId: string;
};
//# sourceMappingURL=getCartOwner.d.ts.map