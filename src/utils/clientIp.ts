import type { Request } from "express";
export const getClientIp = (req: Request) => {
    const userAgent = req.get('User-Agent') || 'unknown';
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string'
        ? forwarded.split(',')[0]
        : (req.headers['x-real-ip'] as string) || req.socket.remoteAddress || '0.0.0.0';

    return {userAgent, ip}
}