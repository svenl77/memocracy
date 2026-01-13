import { LRUCache } from 'lru-cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory rate limiting using LRU Cache
 * For production with multiple instances, consider using Redis
 */

interface RateLimitOptions {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

// Create cache for rate limiting
const tokenCache = new LRUCache<string, number[]>({
  max: 500, // Max 500 unique IPs/tokens
  ttl: 60000, // 1 minute TTL
});

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP address, wallet, etc.)
 * @param options - Rate limit options
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {
    interval: 60000, // 1 minute
    uniqueTokenPerInterval: 10, // 10 requests per minute
  }
): boolean {
  const now = Date.now();
  const userTimestamps = tokenCache.get(identifier) || [];
  
  // Filter timestamps within the interval
  const recentTimestamps = userTimestamps.filter(
    (ts) => now - ts < options.interval
  );
  
  // Check if limit exceeded
  if (recentTimestamps.length >= options.uniqueTokenPerInterval) {
    return false; // Rate limited
  }
  
  // Add current timestamp
  recentTimestamps.push(now);
  tokenCache.set(identifier, recentTimestamps);
  
  return true; // Allowed
}

/**
 * Get client identifier from request
 * Uses IP address or X-Forwarded-For header
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from headers (for proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  // Fallback to IP from request
  const ip = request.headers.get('x-real-ip') || 
             request.ip || 
             'unknown';
  
  return ip;
}

/**
 * Rate limit middleware for API routes
 * Returns 429 if rate limited, otherwise null
 */
export function rateLimitMiddleware(
  request: NextRequest,
  options?: RateLimitOptions
): NextResponse | null {
  const identifier = getClientIdentifier(request);
  
  if (!checkRateLimit(identifier, options)) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      }
    );
  }
  
  return null; // Request allowed
}

/**
 * Rate limit configuration presets
 */
export const rateLimitPresets = {
  // Strict: 5 requests per minute
  strict: {
    interval: 60000,
    uniqueTokenPerInterval: 5,
  },
  // Default: 10 requests per minute
  default: {
    interval: 60000,
    uniqueTokenPerInterval: 10,
  },
  // Moderate: 20 requests per minute
  moderate: {
    interval: 60000,
    uniqueTokenPerInterval: 20,
  },
  // Lenient: 50 requests per minute
  lenient: {
    interval: 60000,
    uniqueTokenPerInterval: 50,
  },
  // API: 100 requests per minute
  api: {
    interval: 60000,
    uniqueTokenPerInterval: 100,
  },
};
