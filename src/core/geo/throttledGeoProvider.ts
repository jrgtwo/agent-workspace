import type { GeoPlace, GeoProvider, RouteResult } from './types'

export interface ThrottleOpts {
  /** Minimum gap between outgoing requests (public Nominatim/OSRM allow ~1/sec). */
  minIntervalMs?: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

/**
 * Wrap a GeoProvider so requests are SERIALIZED with a minimum interval between them, and geocode
 * results are CACHED + in-flight-deduped. The map geocodes a whole day's stops in one burst and re-runs
 * as coordinates land; hitting the public Nominatim/OSRM endpoints that way trips their rate limit (429)
 * and the throttled error responses drop CORS headers. This makes us a well-behaved client without
 * changing callers. (Self-hosting later removes the need for the interval — caching still helps.)
 */
export function createThrottledGeoProvider(inner: GeoProvider, opts: ThrottleOpts = {}): GeoProvider {
  const minInterval = opts.minIntervalMs ?? 1100
  const now = opts.now ?? (() => Date.now())
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))

  let tail: Promise<unknown> = Promise.resolve()
  let lastStart = -Infinity

  // Queue fn after everything already scheduled, leaving >= minInterval since the last call started.
  const schedule = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = tail.then(async () => {
      const wait = minInterval - (now() - lastStart)
      if (wait > 0) await sleep(wait)
      lastStart = now()
      return fn()
    })
    tail = run.then(() => undefined, () => undefined) // keep the chain alive through failures
    return run
  }

  // Cache the PROMISE (not just the result) so concurrent identical queries share one request.
  const cache = new Map<string, Promise<GeoPlace[]>>()

  return {
    id: inner.id,
    label: inner.label,
    geocode(query: string): Promise<GeoPlace[]> {
      const key = query.trim().toLowerCase()
      let p = cache.get(key)
      if (!p) {
        p = schedule(() => inner.geocode(query))
        // Cache only a non-empty success. Failures AND empty results stay retryable so a later call
        // (e.g. the manual "Locate" button) actually re-queries instead of replaying a cached miss.
        p.then((places) => { if (!places.length) cache.delete(key) }, () => cache.delete(key))
        cache.set(key, p)
      }
      return p
    },
    route(coords: { lat: number; lng: number }[]): Promise<RouteResult> {
      return schedule(() => inner.route(coords))
    },
  }
}
