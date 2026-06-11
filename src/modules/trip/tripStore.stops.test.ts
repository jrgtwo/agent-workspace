import { describe, it, expect } from 'vitest'
import { TripStore } from './tripStore'

let n = 0
const genId = () => `s-${++n}`

function setup() {
  const s = new TripStore(genId)
  const trip = s.createTrip('T')
  const day = s.getTrip(trip)!.days[0].id
  return { s, trip, day }
}

describe('TripStore — stops', () => {
  it('adds, updates and removes a stop', () => {
    const { s, trip, day } = setup()
    const stop = s.addStop(trip, day, { name: 'Louvre' })
    expect(s.getTrip(trip)!.days[0].stops[0].name).toBe('Louvre')

    s.updateStop(trip, day, stop, { time: '09:00', lat: 48.86, lng: 2.34 })
    const updated = s.getTrip(trip)!.days[0].stops[0]
    expect(updated.time).toBe('09:00')
    expect(updated.lat).toBe(48.86)

    s.removeStop(trip, day, stop)
    expect(s.getTrip(trip)!.days[0].stops).toHaveLength(0)
  })

  it('reorders stops by id', () => {
    const { s, trip, day } = setup()
    const a = s.addStop(trip, day, { name: 'A' })
    const b = s.addStop(trip, day, { name: 'B' })
    const c = s.addStop(trip, day, { name: 'C' })
    s.reorderStops(trip, day, [c, a, b])
    expect(s.getTrip(trip)!.days[0].stops.map((x) => x.name)).toEqual(['C', 'A', 'B'])
  })
})
