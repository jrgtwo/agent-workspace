import { describe, it, expect, vi } from 'vitest'
import { OsmGeoProvider } from './osmGeoProvider'

describe('OsmGeoProvider.geocode', () => {
  it('maps Nominatim JSON to GeoPlace[]', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify([
        { display_name: 'Louvre, Paris', lat: '48.8606', lon: '2.3376', class: 'tourism' },
      ]), { status: 200 }),
    ) as unknown as typeof fetch

    const p = new OsmGeoProvider({ fetchImpl })
    const places = await p.geocode('Louvre')
    expect(places).toEqual([{ name: 'Louvre, Paris', lat: 48.8606, lng: 2.3376, category: 'tourism' }])
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('parses Nominatim boundingbox into a GeoPlace.bbox (used to scope the Overpass fallback)', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify([
        { display_name: 'Maui, Hawaii', lat: '20.8', lon: '-156.3', boundingbox: ['20.45', '21.05', '-156.75', '-155.95'] },
      ]), { status: 200 }),
    ) as unknown as typeof fetch
    const p = new OsmGeoProvider({ fetchImpl })
    const [place] = await p.geocode('Maui')
    expect(place.bbox).toEqual({ south: 20.45, north: 21.05, west: -156.75, east: -155.95 })
  })

  it('throws a friendly error when the provider is unreachable', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('network down') }) as unknown as typeof fetch
    const p = new OsmGeoProvider({ fetchImpl })
    await expect(p.geocode('x')).rejects.toThrow(/couldn't reach/i)
  })
})
