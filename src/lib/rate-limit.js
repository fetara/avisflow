// Rate limiter en mémoire (suffisant pour démarrer ; brancher Upstash Redis en production si besoin).
const buckets = new Map();

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const bucket = buckets.get(key) || { count: 0, reset: now + windowMs };
  if (now > bucket.reset) {
    bucket.count = 0;
    bucket.reset = now + windowMs;
  }
  bucket.count += 1;
  buckets.set(key, bucket);
  // Nettoyage périodique
  if (buckets.size > 10000) {
    for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
  }
  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    reset: bucket.reset,
  };
}
