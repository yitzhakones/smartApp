// Minimal in-memory sliding-window rate limiter. Per-process: works well in dev
// (single process) and acts as a per-instance backstop in serverless. It is NOT
// a substitute for a shared/distributed limiter, but it caps a runaway client
// loop so it can't hammer the server — or the Claude API — indefinitely.

const hits = new Map<string, number[]>()

/**
 * Returns true if the call is allowed, false if the key has exceeded `limit`
 * calls within the trailing `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= windowMs)) hits.delete(k)
    }
  }
  return true
}
