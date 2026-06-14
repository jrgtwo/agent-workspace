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

describe('pick-on-map (manual placement)', () => {
  it('startPlacing marks a stop as awaiting a map click; stopPlacing clears it', () => {
    const { s, day } = setup()
    const a = s.addStop(s.getState().activeId!, day, { name: 'A' })
    s.startPlacing(a)
    expect(s.getState().placingStopId).toBe(a)
    s.stopPlacing()
    expect(s.getState().placingStopId).toBeNull()
  })

  it('pickLocation sets the placing stop\'s coords (precise, not approximate) and ends placing mode', () => {
    const { s, trip, day } = setup()
    const a = s.addStop(trip, day, { name: 'A' })
    s.updateStop(trip, day, a, { lat: 20.8, lng: -156.3, approximate: true }) // was a centroid guess
    s.startPlacing(a)
    s.pickLocation(20.9, -156.5)
    const stop = s.getTrip(trip)!.days[0].stops[0]
    expect(stop).toMatchObject({ lat: 20.9, lng: -156.5, approximate: false })
    expect(s.getState().placingStopId).toBeNull()
  })

  it('pickLocation is a no-op when nothing is being placed', () => {
    const { s, trip, day } = setup()
    s.addStop(trip, day, { name: 'A' })
    s.pickLocation(1, 2)
    expect(s.getTrip(trip)!.days[0].stops[0].lat).toBeUndefined()
  })
})
