import { describe, it, expect, vi } from 'vitest'
import { createStopLocator } from './locate'
import type { GeoPlace, BBox } from '../../core/geo/types'

const MAUI_BBOX: BBox = { south: 20.45, west: -156.75, north: 21.05, east: -155.95 }

function deps(geocode: (q: string) => Promise<GeoPlace[]>, searchByName?: (n: string, b: BBox) => Promise<GeoPlace[]>) {
  return {
    geo: { geocode: vi.fn(geocode) },
    overpass: { searchByName: vi.fn(searchByName ?? (async () => [])) },
  }
}

describe('createStopLocator', () => {
  it('returns the Nominatim hit and never calls Overpass when the geocoder succeeds', async () => {
    const d = deps(async () => [{ name: 'Sam Sato\'s, Wailuku', lat: 20.9, lng: -156.5 }])
    const { locate } = createStopLocator(d)
    const hit = await locate({ name: 'Sam Sato\'s' }, 'Maui, Hawaii')
    expect(hit?.name).toBe('Sam Sato\'s, Wailuku')
    expect(d.overpass.searchByName).not.toHaveBeenCalled()
  })

  it('falls back to Overpass (scoped to the destination bbox) when the geocoder finds nothing', async () => {
    const geocode = async (q: string): Promise<GeoPlace[]> =>
      q.startsWith('Maui') ? [{ name: 'Maui', lat: 20.8, lng: -156.3, bbox: MAUI_BBOX }] : [] // destination resolves w/ bbox; stop does not
    const overpass = async (): Promise<GeoPlace[]> => [
      { name: 'Random Spot', lat: 1, lng: 1 },
      { name: 'Leodas Kitchen and Pie Shop', lat: 20.79, lng: -156.49 },
    ]
    const d = deps(geocode, overpass)
    const { locate } = createStopLocator(d)
    const hit = await locate({ name: 'Leoda\'s Kitchen & Pie Shop' }, 'Maui, Hawaii')
    expect(d.overpass.searchByName).toHaveBeenCalledWith('Leoda\'s Kitchen & Pie Shop', MAUI_BBOX)
    expect(hit?.name).toBe('Leodas Kitchen and Pie Shop') // best token-overlap match
  })

  it('does not call Overpass when there is no destination to bound the search', async () => {
    const d = deps(async () => [])
    const { locate } = createStopLocator(d)
    expect(await locate({ name: 'Nowhere' })).toBeNull()
    expect(d.overpass.searchByName).not.toHaveBeenCalled()
  })

  it('returns null when Overpass also finds nothing usable', async () => {
    const geocode = async (q: string): Promise<GeoPlace[]> =>
      q.startsWith('Maui') ? [{ name: 'Maui', lat: 20.8, lng: -156.3, bbox: MAUI_BBOX }] : []
    const d = deps(geocode, async () => [{ name: 'Totally Unrelated', lat: 1, lng: 1 }])
    const { locate } = createStopLocator(d)
    expect(await locate({ name: 'Nick\'s Fishmarket' }, 'Maui, Hawaii')).toBeNull()
  })

  it('returns null (does not throw) if Overpass errors', async () => {
    const geocode = async (q: string): Promise<GeoPlace[]> =>
      q.startsWith('Maui') ? [{ name: 'Maui', lat: 20.8, lng: -156.3, bbox: MAUI_BBOX }] : []
    const d = deps(geocode, async () => { throw new Error('overpass down') })
    const { locate } = createStopLocator(d)
    expect(await locate({ name: 'Leoda\'s' }, 'Maui, Hawaii')).toBeNull()
  })
})
