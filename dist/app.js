import express, {} from "express";
import { ConnectDB } from "./config/db.js";
import helmet from "helmet";
import cors from "cors";
import authRoutes from './routes/auth.routes.js';
import brandingRoutes from './routes/branding.routes.js';
import locationRoutes from './routes/location.routes.js';
import serviceRoutes from './routes/service.routes.js';
import pricingRoutes from './routes/pricing.routes.js';
import packageRoutes from './routes/package.routes.js';
const app = express();
// Connect DB
ConnectDB();
// Middleware
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};
app.use(cors(corsOptions));
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/branding', brandingRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/service', serviceRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/package', packageRoutes);
// Routes
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});
// Error handling middlware
app.use((err, req, res, next) => {
    console.error(err.stack);
    const message = process.env.NODE_ENV === "production" ? "Internal server Error" : err.message;
    res.status(500).json({ success: false, message });
});
export default app;
//# sourceMappingURL=app.js.map