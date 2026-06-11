import { describe, it, expect, vi } from 'vitest'
import { OsmGeoProvider } from './osmGeoProvider'

describe('OsmGeoProvider.route', () => {
  it('maps an OSRM response to RouteResult', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({
        code: 'Ok',
        routes: [{ distance: 1200, duration: 900, geometry: { type: 'LineString', coordinates: [[2.33, 48.86], [2.34, 48.87]] } }],
      }), { status: 200 }),
    ) as unknown as typeof fetch

    const p = new OsmGeoProvider({ fetchImpl })
    const r = await p.route([{ lat: 48.86, lng: 2.33 }, { lat: 48.87, lng: 2.34 }])
    expect(r.distanceM).toBe(1200)
    expect(r.durationS).toBe(900)
    expect(r.geometry.coordinates).toHaveLength(2)
  })

  it('throws when OSRM returns no route', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ code: 'NoRoute', routes: [] }), { status: 200 }),
    ) as unknown as typeof fetch
    const p = new OsmGeoProvider({ fetchImpl })
    await expect(p.route([{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }])).rejects.toThrow(/no route/i)
  })
})
