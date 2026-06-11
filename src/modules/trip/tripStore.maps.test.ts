import { describe, it, expect } from 'vitest'
import { TripStore } from './tripStore'

let n = 0
const genId = () => `m-${++n}`

describe('TripStore — maps consent', () => {
  it('toggles the per-trip mapsEnabled flag', () => {
    const s = new TripStore(genId)
    const t = s.createTrip('T')
    expect(s.getTrip(t)!.mapsEnabled).toBe(false)
    s.setMapsEnabled(t, true)
    expect(s.getTrip(t)!.mapsEnabled).toBe(true)
    s.setMapsEnabled(t, false)
    expect(s.getTrip(t)!.mapsEnabled).toBe(false)
  })
})
