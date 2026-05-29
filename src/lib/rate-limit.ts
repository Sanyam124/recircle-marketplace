import RequestLog from '@/models/RequestLog';

/**
 * Basic IP-based rate limiting using MongoDB
 * @param ip User IP address
 * @param path API Path being called
 * @param limit Maximum allowed requests
 * @param windowMs Time window in milliseconds
 * @returns { success: boolean, remaining: number, resetTime?: Date }
 */
export async function checkRateLimit(ip: string, path: string, limit: number, windowMs: number) {
    const now = new Date();
    
    // Find or create the log
    let log = await RequestLog.findOne({ ip, path });

    if (!log) {
        log = await RequestLog.create({ 
            ip, 
            path, 
            count: 1, 
            lastRequest: now 
        });
        return { success: true, remaining: limit - 1 };
    }

    // Reset count if window has passed
    const timePassed = now.getTime() - new Date(log.lastRequest).getTime();
    if (timePassed > windowMs) {
        log.count = 1;
        log.lastRequest = now;
        await log.save();
        return { success: true, remaining: limit - 1 };
    }

    // Check limit
    if (log.count >= limit) {
        const resetTime = new Date(new Date(log.lastRequest).getTime() + windowMs);
        return { success: false, remaining: 0, resetTime };
    }

    // Increment count
    log.count += 1;
    await log.save();

    return { success: true, remaining: limit - log.count };
}

export function getClientIp(req: Request) {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return (req as any).ip || '127.0.0.1';
}
