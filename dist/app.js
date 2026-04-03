import express, {} from "express";
import { ConnectDB } from "./config/db.js";
import helmet from "helmet";
import cors from "cors";
import authRoutes from './routes/auth.routes.js';
import brandingRoutes from './routes/branding.routes.js';
import locationRoutes from './routes/location.routes.js';
import cityRoutes from './routes/city.routes.js';
import stateRoutes from './routes/state.routes.js';
import serviceRoutes from './routes/service.routes.js';
import packageRoutes from './routes/package.routes.js';
import productRoutes from './routes/product.routes.js';
import categoryRoutes from './routes/category.routes.js';
const app = express();
// Connect DB
ConnectDB();
const allowedOrigins = [
    "https://heartfelt-gelato-d455e0.netlify.app",
    "http://localhost:3001"
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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};
app.use(cors(corsOptions));
app.options('/*splat', cors(corsOptions));
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
app.use('/api/city', cityRoutes);
app.use('/api/state', stateRoutes);
app.use('/api/product', productRoutes);
app.use('/api/service', serviceRoutes);
app.use('/api/package', packageRoutes);
app.use('/api/category', categoryRoutes);
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