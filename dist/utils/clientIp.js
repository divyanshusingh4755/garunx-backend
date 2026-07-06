export const getClientIp = (req) => {
    const userAgent = req.get('User-Agent') || 'unknown';
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string'
        ? forwarded.split(',')[0]
        : req.headers['x-real-ip'] || req.socket.remoteAddress || '0.0.0.0';
    return { userAgent, ip };
};
//# sourceMappingURL=clientIp.js.map