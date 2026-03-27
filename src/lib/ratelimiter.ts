interface RateLimitRecord {
  count: number;
  lastReset: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

export interface RateLimitConfig {
  limit: number;     // max requests
  windowMs: number;  // time window in ms
}

/**
 * Simple in-memory rate limiter
 * @param identifier - Key to limit (e.g., IP address or User ID)
 * @param config - Rate limit configuration
 * @returns { success: boolean, remaining: number, reset: number }
 */
export function rateLimit(identifier: string, config: RateLimitConfig = { limit: 100, windowMs: 60000 }) {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record) {
    rateLimitMap.set(identifier, { count: 1, lastReset: now });
    return {
      success: true,
      remaining: config.limit - 1,
      reset: now + config.windowMs,
    };
  }

  // If window expired, reset
  if (now - record.lastReset > config.windowMs) {
    record.count = 1;
    record.lastReset = now;
    return {
      success: true,
      remaining: config.limit - 1,
      reset: now + config.windowMs,
    };
  }

  // Increment and check
  record.count += 1;
  const success = record.count <= config.limit;
  const remaining = Math.max(0, config.limit - record.count);
  const reset = record.lastReset + config.windowMs;

  return {
    success,
    remaining,
    reset,
  };
}

// Cleanup interval to prevent memory leaks (runs every 5 mins)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      // If the record hasn't been used in 10 minutes, remove it
      if (now - record.lastReset > 600000) { 
        rateLimitMap.delete(key);
      }
    }
  }, 300000);
}
