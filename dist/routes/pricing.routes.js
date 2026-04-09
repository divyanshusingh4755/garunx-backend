import { Router } from "express";
import { calculatePrice } from "../controllers/pricing.controllers.js";
const router = Router();
router.post('/calculate', calculatePrice);
export default router;
//# sourceMappingURL=pricing.routes.js.map