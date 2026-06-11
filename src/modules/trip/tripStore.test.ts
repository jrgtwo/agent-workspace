import { describe, it, expect } from 'vitest'
import { TripStore } from './tripStore'

let n = 0
const genId = () => `t-${++n}`

describe('TripStore — trips', () => {
  it('starts empty', () => {
    const s = new TripStore(genId)
    expect(s.getState().trips).toEqual([])
    expect(s.getState().activeId).toBeNull()
  })

  it('creates a trip with one default day, makes it active and focused', () => {
    const s = new TripStore(genId)
    const id = s.createTrip('Paris')
    const trip = s.getTrip(id)!
    expect(trip.title).toBe('Paris')
    expect(trip.mapsEnabled).toBe(false)
    expect(trip.days).toHaveLength(1)
    expect(trip.days[0].label).toBe('Day 1')
    expect(s.getState().activeId).toBe(id)
    expect(s.getState().focusedDayId).toBe(trip.days[0].id)
  })

  it('renames, switches, and deletes trips (clearing active when the active one is deleted)', () => {
    const s = new TripStore(genId)
    const a = s.createTrip('A')
    const b = s.createTrip('B')
    s.renameTrip(a, 'A2')
    expect(s.getTrip(a)!.title).toBe('A2')
    s.switchTrip(a)
    expect(s.getState().activeId).toBe(a)
    s.deleteTrip(a)
    expect(s.getTrip(a)).toBeUndefined()
    expect(s.getState().activeId).toBe(b) // falls back to a remaining trip
  })

  it('hydrate replaces state', () => {
    const s = new TripStore(genId)
    s.hydrate({
      trips: [{ id: 'x', title: 'Hydrated', mapsEnabled: true, days: [] }],
      activeId: 'x',
      focusedDayId: null,
    })
    expect(s.getTrip('x')!.title).toBe('Hydrated')
  })
})
