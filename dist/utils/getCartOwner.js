import { HttpError } from "../utils/httpError.js";
const getSingleHeaderValue = (value) => {
    if (typeof value !== "string") {
        return undefined;
    }
    const normalized = value.trim();
    return normalized || undefined;
};
export const getCartOwner = (req) => {
    const userId = req.user?.userId;
    /*
     * An authenticated user always owns their authenticated cart.
     * Ignoring x-guest-id here prevents a caller from creating
     * ambiguous owner queries containing both identities.
     */
    if (userId) {
        return {
            userId,
        };
    }
    const guestId = getSingleHeaderValue(req.headers["x-guest-id"]);
    if (!guestId) {
        throw new HttpError(401, "Authentication or guestId is required");
    }
    return {
        guestId,
    };
};
export const buildCartOwnerQuery = (owner) => {
    if ("userId" in owner) {
        return {
            userId: owner.userId,
        };
    }
    return {
        guestId: owner.guestId,
    };
};
//# sourceMappingURL=getCartOwner.js.map