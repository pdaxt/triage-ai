import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Redis client (uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Rate limiters for different endpoints
const rateLimiters = {
  // Conversation start: 10 requests per minute per IP
  start: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        analytics: true,
        prefix: 'ratelimit:start',
      })
    : null,

  // Message send: 30 requests per minute per IP (allows conversation flow)
  message: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '1 m'),
        analytics: true,
        prefix: 'ratelimit:message',
      })
    : null,

  // General API: 60 requests per minute per IP
  general: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        analytics: true,
        prefix: 'ratelimit:general',
      })
    : null,
};

// Fallback in-memory rate limiter (for when Redis is not configured)
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

function checkInMemoryLimit(key: string, limit: number, windowMs: number): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const record = inMemoryStore.get(key);

  if (!record || record.resetAt < now) {
    // New window
    inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, reset: record.resetAt };
  }

  record.count++;
  return { success: true, remaining: limit - record.count, reset: record.resetAt };
}

// Clean up old entries periodically (basic memory management)
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(inMemoryStore.entries());
  for (const [key, record] of entries) {
    if (record.resetAt < now) {
      inMemoryStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export type RateLimitType = 'start' | 'message' | 'general';

const limits: Record<RateLimitType, { limit: number; windowMs: number }> = {
  start: { limit: 10, windowMs: 60000 },
  message: { limit: 30, windowMs: 60000 },
  general: { limit: 60, windowMs: 60000 },
};

export async function checkRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  type: RateLimitType = 'general'
): Promise<boolean> {
  // Get client IP
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket?.remoteAddress || 'unknown';

  const identifier = `${ip}:${type}`;
  const limiter = rateLimiters[type];
  const config = limits[type];

  let result: { success: boolean; remaining: number; reset: number };

  if (limiter) {
    // Use Upstash Redis rate limiter
    const upstashResult = await limiter.limit(identifier);
    result = {
      success: upstashResult.success,
      remaining: upstashResult.remaining,
      reset: upstashResult.reset,
    };
  } else {
    // Fallback to in-memory rate limiter
    result = checkInMemoryLimit(identifier, config.limit, config.windowMs);
  }

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', config.limit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.reset / 1000));

  if (!result.success) {
    res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Please try again in ${Math.ceil((result.reset - Date.now()) / 1000)} seconds.`,
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    });
    return false;
  }

  return true;
}

// Middleware wrapper for cleaner usage
export function withRateLimit(type: RateLimitType = 'general') {
  return async (
    req: VercelRequest,
    res: VercelResponse,
    handler: (req: VercelRequest, res: VercelResponse) => Promise<any>
  ) => {
    const allowed = await checkRateLimit(req, res, type);
    if (!allowed) return;
    return handler(req, res);
  };
}
