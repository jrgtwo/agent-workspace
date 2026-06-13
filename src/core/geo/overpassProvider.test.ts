import { describe, it, expect, vi } from 'vitest'
import { OverpassProvider } from './overpassProvider'

const canned = {
  elements: [
    { type: 'node', lat: 20.79, lon: -156.49, tags: { name: 'Leodas Kitchen and Pie Shop', amenity: 'restaurant' } },
    { type: 'way', center: { lat: 20.8, lon: -156.5 }, tags: { name: 'Some Other Place', shop: 'bakery' } },
    { type: 'node', lat: 20.7, lon: -156.4, tags: { highway: 'bus_stop' } }, // no name → skipped
  ],
}

function fakeFetch(captured: { ql?: string }) {
  return vi.fn(async (_url: string, init?: { body?: URLSearchParams }) => {
    captured.ql = init?.body?.get('data') ?? ''
    return { ok: true, json: async () => canned } as unknown as Response
  }) as unknown as typeof fetch
}

const BBOX = { south: 20.45, west: -156.75, north: 21.05, east: -155.95 }

describe('OverpassProvider', () => {
  it('queries by a fuzzy name regex within the bbox and parses named elements', async () => {
    const captured: { ql?: string } = {}
    const p = new OverpassProvider({ fetchImpl: fakeFetch(captured), url: '/overpass' })
    const places = await p.searchByName("Leoda's Kitchen & Pie Shop", BBOX)

    expect(captured.ql).toContain('name"~"leoda.?s.*kitchen"')
    expect(captured.ql).toContain('(20.45,-156.75,21.05,-155.95)')
    // both named elements parsed (node lat/lon + way center); the unnamed bus stop dropped
    expect(places.map((x) => x.name)).toEqual(['Leodas Kitchen and Pie Shop', 'Some Other Place'])
    expect(places[0]).toMatchObject({ lat: 20.79, lng: -156.49, category: 'restaurant' })
    expect(places[1]).toMatchObject({ lat: 20.8, lng: -156.5 })
  })

  it('returns [] for a name with no significant words (nothing to search)', async () => {
    const captured: { ql?: string } = {}
    const fetchImpl = fakeFetch(captured)
    const p = new OverpassProvider({ fetchImpl, url: '/overpass' })
    expect(await p.searchByName('the and of', BBOX)).toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
