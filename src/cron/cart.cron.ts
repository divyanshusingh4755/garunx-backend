import cron from "node-cron";
import CartService from "../services/cart.service.js";

export const startCartCronJobs = () => {
    cron.schedule("* * * * *", async () => {
        try {
            const result = await CartService.expirePendingCheckouts();
            console.log("[CRON] Cart checkout expiry:", result);
        } catch (error) {
            console.error("[CRON] Cart cron failed:", error);
        }
    }, { name: "cart-processing", timezone: "UTC", noOverlap: true },
    );
};