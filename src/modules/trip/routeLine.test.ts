import { describe, it, expect } from 'vitest'
import { routeLatLngs } from './routeLine'

describe('routeLatLngs', () => {
  it('uses OSRM geometry when present ([lng,lat] → [lat,lng])', () => {
    const pins = [{ lat: 48.86, lng: 2.33 }, { lat: 48.87, lng: 2.34 }]
    const geo = { type: 'LineString' as const, coordinates: [[2.33, 48.86], [2.335, 48.865], [2.34, 48.87]] as [number, number][] }
    expect(routeLatLngs(pins, geo)).toEqual([[48.86, 2.33], [48.865, 2.335], [48.87, 2.34]])
  })

  it('falls back to straight lines between pins when geometry is null', () => {
    const pins = [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }]
    expect(routeLatLngs(pins, null)).toEqual([[1, 2], [3, 4]])
  })
})
