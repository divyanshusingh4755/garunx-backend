import express, {} from "express";
import { ConnectDB } from "./config/db.js";
import helmet from "helmet";
import cors from "cors";
import authRoutes from './routes/auth.routes.js';
import brandingRoutes from './routes/branding.routes.js';
import locationRoutes from './routes/location.routes.js';
const app = express();
// Connect DB
ConnectDB();
// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', false);
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/branding', brandingRoutes);
app.use('/api/location', locationRoutes);
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