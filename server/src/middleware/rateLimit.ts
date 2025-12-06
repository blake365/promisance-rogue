/**
 * Rate Limiting Middleware for Cloudflare Workers
 *
 * Uses D1 database for distributed rate limiting with sliding window.
 * Tracks request timestamps per key and enforces limits.
 */

import type { Context, Next } from 'hono';
import type { Env } from '../types';

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Key generator function (e.g., IP, player ID) */
  keyGenerator: (c: Context<{ Bindings: Env }>) => string;
  /** Optional message for rate limit exceeded response */
  message?: string;
}

/**
 * Check if a key is rate limited and record the request.
 * Returns true if the request should be allowed, false if rate limited.
 */
async function checkRateLimit(
  db: D1Database,
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Clean up old entries and count recent requests in a single transaction
  // Use a batch to minimize round trips
  const countResult = await db
    .prepare('SELECT COUNT(*) as count FROM rate_limits WHERE key = ? AND timestamp > ?')
    .bind(key, windowStart)
    .first<{ count: number }>();

  const count = countResult?.count ?? 0;

  if (count >= maxRequests) {
    // Get oldest timestamp in window to calculate reset time
    const oldest = await db
      .prepare('SELECT MIN(timestamp) as oldest FROM rate_limits WHERE key = ? AND timestamp > ?')
      .bind(key, windowStart)
      .first<{ oldest: number }>();

    return {
      allowed: false,
      remaining: 0,
      resetAt: (oldest?.oldest ?? now) + windowMs,
    };
  }

  // Record this request
  await db
    .prepare('INSERT INTO rate_limits (key, timestamp) VALUES (?, ?)')
    .bind(key, now)
    .run();

  // Periodically clean up old entries (1% chance to avoid doing it every request)
  if (Math.random() < 0.01) {
    await db
      .prepare('DELETE FROM rate_limits WHERE timestamp < ?')
      .bind(windowStart - windowMs) // Clean entries older than 2 windows
      .run();
  }

  return {
    allowed: true,
    remaining: maxRequests - count - 1,
    resetAt: now + windowMs,
  };
}

/**
 * Create rate limiting middleware.
 *
 * @example
 * // Limit auth endpoints to 5 requests per minute
 * app.use('/api/auth/*', rateLimit({
 *   maxRequests: 5,
 *   windowMs: 60 * 1000,
 *   keyGenerator: (c) => c.req.header('CF-Connecting-IP') || 'unknown',
 * }));
 */
export function rateLimit(config: RateLimitConfig) {
  const { maxRequests, windowMs, keyGenerator, message = 'Too many requests' } = config;

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const key = keyGenerator(c);

    // Skip rate limiting for empty keys
    if (!key) {
      return next();
    }

    const result = await checkRateLimit(c.env.DB, key, maxRequests, windowMs);

    // Add rate limit headers
    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(result.remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

    if (!result.allowed) {
      c.header('Retry-After', String(Math.ceil((result.resetAt - Date.now()) / 1000)));
      return c.json({ error: message }, 429);
    }

    return next();
  };
}

/**
 * Get IP address from request (Cloudflare-aware).
 */
export function getClientIP(c: Context): string {
  return c.req.header('CF-Connecting-IP') ||
         c.req.header('X-Real-IP') ||
         c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
         'unknown';
}

/**
 * Get player ID from context if authenticated, falls back to IP.
 */
export function getPlayerId(c: Context): string {
  try {
    const playerId = c.get('playerId');
    if (playerId) return playerId;
  } catch {
    // playerId not set in context
  }
  return getClientIP(c);
}
