import { Types, } from "mongoose";
import { ensureRedisCacheConnection, redisCacheClient } from "../config/redis.js";
const serializeCacheValue = (value) => {
    return JSON.stringify(value, function (key, currentValue) {
        const originalValue = key === ""
            ? value
            : this[key];
        if (originalValue instanceof
            Date) {
            return {
                __redisCacheType: "Date",
                value: originalValue
                    .toISOString(),
            };
        }
        if (originalValue instanceof
            Types.ObjectId) {
            return {
                __redisCacheType: "ObjectId",
                value: originalValue
                    .toHexString(),
            };
        }
        return currentValue;
    });
};
const deserializeCacheValue = (value) => {
    return JSON.parse(value, (_key, currentValue) => {
        if (!currentValue ||
            typeof currentValue !==
                "object") {
            return currentValue;
        }
        const marker = currentValue;
        if (marker
            .__redisCacheType ===
            "Date" &&
            typeof marker.value ===
                "string") {
            return new Date(marker.value);
        }
        if (marker
            .__redisCacheType ===
            "ObjectId" &&
            typeof marker.value ===
                "string" &&
            Types.ObjectId.isValid(marker.value)) {
            return new Types.ObjectId(marker.value);
        }
        return currentValue;
    });
};
export class RedisCacheService {
    static async ready() {
        try {
            return await ensureRedisCacheConnection();
        }
        catch (error) {
            console.error("[REDIS CACHE] Ready check failed:", error);
            return false;
        }
    }
    static async get(key) {
        try {
            if (!(await this.ready())) {
                return null;
            }
            const cached = await redisCacheClient
                .get(key);
            if (cached ===
                null) {
                return null;
            }
            return deserializeCacheValue(cached);
        }
        catch (error) {
            console.error(`[REDIS CACHE] GET failed for ${key}:`, error);
            return null;
        }
    }
    static async set(key, value, ttlSeconds) {
        if (!Number.isInteger(ttlSeconds) ||
            ttlSeconds <=
                0) {
            throw new Error("Cache TTL must be a positive integer");
        }
        try {
            if (!(await this.ready())) {
                return false;
            }
            await redisCacheClient
                .set(key, serializeCacheValue(value), {
                EX: ttlSeconds,
            });
            return true;
        }
        catch (error) {
            console.error(`[REDIS CACHE] SET failed for ${key}:`, error);
            return false;
        }
    }
    static async delete(key) {
        try {
            if (!(await this.ready())) {
                return false;
            }
            await redisCacheClient
                .del(key);
            return true;
        }
        catch (error) {
            console.error(`[REDIS CACHE] DEL failed for ${key}:`, error);
            return false;
        }
    }
    static async deleteByPattern(pattern) {
        try {
            if (!(await this.ready())) {
                return 0;
            }
            let deleted = 0;
            for await (const keys of redisCacheClient
                .scanIterator({
                MATCH: pattern,
                COUNT: 100,
            })) {
                if (keys.length ===
                    0) {
                    continue;
                }
                deleted +=
                    await redisCacheClient
                        .del(keys);
            }
            return deleted;
        }
        catch (error) {
            console.error(`[REDIS CACHE] Pattern deletion failed for ${pattern}:`, error);
            return 0;
        }
    }
    static async getOrSet(params) {
        const cached = await this.get(params.key);
        if (cached !==
            null) {
            return cached;
        }
        const value = await params.loader();
        /*
         * Cache failure is intentionally ignored.
         * MongoDB/source-of-truth result still returns.
         */
        await this.set(params.key, value, params.ttlSeconds);
        return value;
    }
}
//# sourceMappingURL=redis-cache.service.js.map