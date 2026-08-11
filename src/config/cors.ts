import type { CorsOptions } from "cors";

export const allowedOrigins = new Set([
  "https://heartfelt-gelato-d455e0.netlify.app",
  "http://localhost:3001",
]);

export const corsOptions: CorsOptions = {
  origin: (origin, callback): void => {
    if (origin === undefined || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"))
  },

  credentials: true,

  methods: [
    "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
  ],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}
