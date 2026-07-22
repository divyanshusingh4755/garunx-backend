import express, {} from "express";
import { ConnectDB } from "./config/db.js";
import helmet from "helmet";
import cors from "cors";
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
import referalRewardRoutes from "./routes/referralreward.routes.js";
import policyRoutes from "./routes/policy.routes.js";
import { paymentWebhooks } from "./controllers/booking.controllers.js";
const app = express();
// Connect DB
ConnectDB();
const allowedOrigins = [
    "https://heartfelt-gelato-d455e0.netlify.app",
    "http://localhost:3001",
];
// Middleware
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
    ],
};
app.use(cors(corsOptions));
app.options("/*splat", cors(corsOptions));
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.post("/api/booking/webhooks/cashfree", express.raw({ type: "application/json" }), paymentWebhooks);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("trust proxy", 1);
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/branding", brandingRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/city", cityRoutes);
app.use("/api/state", stateRoutes);
app.use("/api/component", componentRoutes);
app.use("/api/component-item", componentItemRoutes);
app.use("/api/service", serviceRoutes);
app.use("/api/sub-services", subServicesRoutes);
app.use("/api/service-component", serviceComponentRoutes);
app.use("/api/service-pricing", servicePricingRoutes);
app.use("/api/package", packageRoutes);
app.use("/api/package-tier-map", packageTierMapRoutes);
app.use("/api/package-tier-pricing", packageTierPricingRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/tier", tierRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/family-tree", familyTreeRoutes);
app.use("/api/banner", bannerRoutes);
app.use("/api/faq", faqRoutes);
app.use("/api/coupon", couponRoutes);
app.use("/api/referal-reward", referalRewardRoutes);
app.use("/api/policy", policyRoutes);
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
});
// Error handling middlware
app.use((err, req, res, next) => {
    console.error(err.stack);
    const message = process.env.NODE_ENV === "production"
        ? "Internal server Error"
        : err.message;
    res.status(500).json({ success: false, message });
});
export default app;
//# sourceMappingURL=app.js.map