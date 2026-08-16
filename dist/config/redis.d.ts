import type { ConnectionOptions } from "bullmq";
export declare const redisQueueConnection: ConnectionOptions;
export declare const redisWorkerConnection: ConnectionOptions;
export declare const redisCacheClient: import("redis").RedisClientType<{}, {}, {}, 3, {}>;
export declare const ensureRedisCacheConnection: () => Promise<boolean>;
//# sourceMappingURL=redis.d.ts.map