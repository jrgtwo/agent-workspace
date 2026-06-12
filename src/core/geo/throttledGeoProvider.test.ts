import { describe, it, expect, vi } from 'vitest'
import { createThrottledGeoProvider } from './throttledGeoProvider'
import type { GeoProvider } from './types'

function fakeInner(): GeoProvider {
  return {
    id: 'fake',
    label: 'Fake',
    geocode: vi.fn(async (q: string) => [{ name: q, lat: 1, lng: 2 }]),
    route: vi.fn(async () => ({ distanceM: 0, durationS: 0, geometry: { type: 'LineString' as const, coordinates: [] } })),
  }
}

describe('createThrottledGeoProvider', () => {
  it('caches geocode results — same query (case-insensitive) calls inner once', async () => {
    const inner = fakeInner()
    const p = createThrottledGeoProvider(inner, { minIntervalMs: 0 })
    await p.geocode('Louvre')
    await p.geocode('louvre')
    expect(inner.geocode).toHaveBeenCalledTimes(1)
  })

  it('dedupes in-flight identical queries (the map burst) into one request', async () => {
    const inner = fakeInner()
    const p = createThrottledGeoProvider(inner, { minIntervalMs: 0 })
    await Promise.all([p.geocode('Hana'), p.geocode('Hana'), p.geocode('Hana')])
    expect(inner.geocode).toHaveBeenCalledTimes(1)
  })

  it('does NOT cache failures, so a later call retries', async () => {
    const inner = fakeInner()
    ;(inner.geocode as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('429'))
    const p = createThrottledGeoProvider(inner, { minIntervalMs: 0 })
    await expect(p.geocode('X')).rejects.toThrow('429')
    await p.geocode('X')
    expect(inner.geocode).toHaveBeenCalledTimes(2)
  })

  it('does NOT cache empty results, so a later "Locate" retry re-queries', async () => {
    const inner = fakeInner()
    ;(inner.geocode as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
    const p = createThrottledGeoProvider(inner, { minIntervalMs: 0 })
    expect(await p.geocode('Dinner at Poipu Town')).toEqual([]) // first lookup: nothing found
    await p.geocode('Dinner at Poipu Town') // retry actually hits the provider again
    expect(inner.geocode).toHaveBeenCalledTimes(2)
  })

  it('spaces requests by at least minIntervalMs (serialized, throttled)', async () => {
    const inner = fakeInner()
    const sleeps: number[] = []
    let clock = 1000
    const p = createThrottledGeoProvider(inner, {
      minIntervalMs: 1000,
      now: () => clock,
      sleep: async (ms) => { sleeps.push(ms); clock += ms },
    })
    await p.geocode('A')
    await p.geocode('B')
    expect(sleeps.some((s) => s >= 900)).toBe(true) // the 2nd call waited ~1s
  })
})
