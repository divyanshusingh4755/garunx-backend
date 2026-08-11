import express, {} from "express";
import cors from "cors";
import { corsOptions } from "./config/cors.js";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes.js";
import brandingRoutes from "./routes/branding.routes.js";
import locationRoutes from "./routes/location.routes.js";
import cityRoutes from "./routes/city.routes.js";
import stateRoutes from "./routes/state.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import serviceComponentRoutes from "./routes/servicecomponent.routes.js";
import servicePricingRoutes from "./routes/servicepricing.routes.js";
import packageRoutes from "./routes/package.routes.js";
import packageTierMapRoutes from "./routes/packagetiermap.routes.js";
import packageTierPricingRoutes from "./routes/packagetierpricing.routes.js";
import componentRoutes from "./routes/component.routes.js";
import componentItemRoutes from "./routes/componentitem.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import familyTreeRoutes from "./routes/family-tree.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import tierRoutes from "./routes/tier.routes.js";
import subServicesRoutes from "./routes/subservices.routes.js";
import bannerRoutes from "./routes/banner.routes.js";
import faqRoutes from "./routes/faq.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import referralRewardRoutes from "./routes/referralreward.routes.js";
import policyRoutes from "./routes/policy.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import queriesRoutes from "./routes/userQuery.routes.js";
import taxRoutes from "./routes/taxprofile.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import { paymentWebhooks } from "./controllers/booking.controllers.js";
import { HttpError } from "./utils/httpError.js";
const app = express();
app.set("trust proxy", 1);
app.use(cors(corsOptions));
app.options("/*splat", cors(corsOptions));
app.use(helmet({
    crossOriginResourcePolicy: {
        policy: "cross-origin",
    },
}));
/*
 * The webhook must remain before express.json().
 * Cashfree signature verification requires the original raw body.
 */
app.post("/api/booking/webhooks/cashfree", express.raw({
    type: "application/json",
}), paymentWebhooks);
app.use(express.json());
app.use(express.urlencoded({
    extended: true,
}));
app.use("/api/auth", authRoutes);
app.use("/api/state", stateRoutes);
app.use("/api/city", cityRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/tier", tierRoutes);
app.use("/api/tax", taxRoutes);
app.use("/api/coupon", couponRoutes);
app.use("/api/referral-reward", referralRewardRoutes);
app.use("/api/component", componentRoutes);
app.use("/api/component-item", componentItemRoutes);
app.use("/api/service", serviceRoutes);
app.use("/api/sub-services", subServicesRoutes);
app.use("/api/service-component", serviceComponentRoutes);
app.use("/api/service-pricing", servicePricingRoutes);
app.use("/api/package", packageRoutes);
app.use("/api/package-tier-map", packageTierMapRoutes);
app.use("/api/package-tier-pricing", packageTierPricingRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/family-tree", familyTreeRoutes);
app.use("/api/banner", bannerRoutes);
app.use("/api/faq", faqRoutes);
app.use("/api/policy", policyRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/queries", queriesRoutes);
app.use("/api/branding", brandingRoutes);
app.use("/api/chat", chatRoutes);
app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
    });
});
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});
app.use((error, _req, res, _next) => {
    const status = error instanceof HttpError ? error.statusCode : 500;
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    if (error instanceof Error) {
        console.error(error.stack ?? error.message);
    }
    else {
        console.error(error);
    }
    const message = process.env.NODE_ENV === "production" && status === 500
        ? "Internal server error"
        : errorMessage;
    res.status(status).json({
        success: false,
        message,
    });
});
export default app;
//# sourceMappingURL=app.js.map