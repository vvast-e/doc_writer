interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Simple in-memory fixed-window rate limiter, keyed by an arbitrary string (e.g. client IP).
 * Good enough for a single Next.js instance; would need a shared store (Redis) behind a
 * multi-instance deployment.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

/**
 * `X-Forwarded-For`/`X-Real-IP` are trivially spoofable by whoever connects directly to the
 * Next.js process — trusting them blindly lets an attacker rotate the header value to dodge
 * per-IP rate limiting entirely. Only honor them when `TRUST_PROXY=true`, which you should set
 * once (and only once) a reverse proxy in front of this app is confirmed to strip any
 * client-supplied XFF/X-Real-IP and set its own. Without a confirmed trusted proxy, every
 * request collapses into a single "unknown" bucket — a global rate limit, which is a safe
 * default (if a bit blunt) since it can't be bypassed by spoofing headers.
 */
export function getClientIp(request: Request): string {
  if (process.env.TRUST_PROXY !== 'true') return 'unknown';

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
