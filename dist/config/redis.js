import { createClient, } from "redis";
const redisHost = process.env.REDIS_HOST ??
    "127.0.0.1";
const redisPort = Number(process.env.REDIS_PORT ??
    6379);
const redisPassword = process.env.REDIS_PASSWORD;
const redisUsername = process.env.REDIS_USERNAME;
const redisDatabase = Number(process.env.REDIS_CACHE_DB ??
    process.env.REDIS_DB ??
    0);
let connectPromise = null;
export const redisQueueConnection = {
    host: redisHost,
    port: redisPort,
    db: redisDatabase,
    ...(redisUsername && {
        username: redisUsername,
    }),
    ...(redisPassword && {
        password: redisPassword,
    }),
    maxRetriesPerRequest: 1,
};
export const redisWorkerConnection = {
    host: redisHost,
    port: redisPort,
    db: redisDatabase,
    ...(redisUsername && {
        username: redisUsername,
    }),
    ...(redisPassword && {
        password: redisPassword,
    }),
    /*
     * BullMQ workers require unlimited
     * Redis request retries.
     */
    maxRetriesPerRequest: null,
};
export const redisCacheClient = createClient({
    socket: {
        host: redisHost,
        port: redisPort,
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
            /*
             * Exponential reconnect with a cap.
             * Cache remains fail-open at the service layer.
             */
            return Math.min(100 *
                2 ** retries, 3000);
        },
    },
    database: redisDatabase,
    ...(redisUsername && {
        username: redisUsername,
    }),
    ...(redisPassword && {
        password: redisPassword,
    }),
});
redisCacheClient.on("error", (error) => {
    console.error("[REDIS CACHE] Client error:", error);
});
export const ensureRedisCacheConnection = async () => {
    if (redisCacheClient.isReady) {
        return true;
    }
    if (connectPromise) {
        try {
            await connectPromise;
            return redisCacheClient.isReady;
        }
        catch {
            return false;
        }
    }
    connectPromise =
        redisCacheClient
            .connect()
            .then(() => undefined)
            .finally(() => {
            connectPromise =
                null;
        });
    try {
        await connectPromise;
        return redisCacheClient.isReady;
    }
    catch (error) {
        console.error("[REDIS CACHE] Connection failed:", error);
        return false;
    }
};
//# sourceMappingURL=redis.js.map