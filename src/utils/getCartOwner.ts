import type { Request } from "express";
import { HttpError } from "../utils/httpError.js";

export interface CartOwner {
  userId?: string;
  guestId?: string;
}

export const getCartOwner = (req: Request): CartOwner => {
  const userId = req.user?.userId;
  const guestId = req.headers["x-guest-id"] as string | undefined;

  if (!userId && !guestId) {
    throw new HttpError(401, "Authentication or guestId is required");
  }

  return {
    ...(userId ? { userId } : {}),
    ...(guestId ? { guestId } : {}),
  };
};

export const buildCartOwnerQuery = (owner: CartOwner) => {
  if (owner.userId) {
    return { userId: owner.userId };
  }

  if (owner.guestId) {
    return { guestId: owner.guestId };
  }

  throw new Error("Cart owner missing");
};
