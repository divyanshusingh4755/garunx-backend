export declare class RedisCacheService {
    private static ready;
    static get<T>(key: string): Promise<T | null>;
    static set(key: string, value: unknown, ttlSeconds: number): Promise<boolean>;
    static delete(key: string): Promise<boolean>;
    static deleteByPattern(pattern: string): Promise<number>;
    static getOrSet<T>(params: {
        key: string;
        ttlSeconds: number;
        loader: () => Promise<T>;
    }): Promise<T>;
}
//# sourceMappingURL=redis-cache.service.d.ts.map