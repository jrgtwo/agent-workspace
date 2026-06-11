import { describe, it, expect } from 'vitest'
import { GeoRegistry } from './geoRegistry'
import type { GeoProvider } from './types'

const fake: GeoProvider = {
  id: 'fake',
  label: 'Fake',
  geocode: async () => [{ name: 'X', lat: 1, lng: 2 }],
  route: async () => ({ distanceM: 0, durationS: 0, geometry: { type: 'LineString', coordinates: [] } }),
}

describe('GeoRegistry', () => {
  it('registers and retrieves a provider by id', () => {
    const r = new GeoRegistry()
    r.register(fake)
    expect(r.get('fake')).toBe(fake)
    expect(r.list()).toHaveLength(1)
  })
})
