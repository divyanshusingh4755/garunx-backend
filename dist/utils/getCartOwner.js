import { HttpError } from "../utils/httpError.js";
export const getCartOwner = (req) => {
    const userId = req.user?.userId;
    const guestId = req.headers["x-guest-id"];
    if (!userId && !guestId) {
        throw new HttpError(401, "Authentication or guestId is required");
    }
    return {
        ...(userId ? { userId } : {}),
        ...(guestId ? { guestId } : {}),
    };
};
export const buildCartOwnerQuery = (owner) => {
    if (owner.userId) {
        return { userId: owner.userId };
    }
    if (owner.guestId) {
        return { guestId: owner.guestId };
    }
    throw new Error("Cart owner missing");
};
//# sourceMappingURL=getCartOwner.js.map