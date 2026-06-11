import { describe, it, expect } from 'vitest'
import { TripStore } from './tripStore'

let n = 0
const genId = () => `d-${++n}`

describe('TripStore — days', () => {
  it('adds a day with an auto label, removes it, and renames it', () => {
    const s = new TripStore(genId)
    const trip = s.createTrip('T')
    const d2 = s.addDay(trip)
    expect(s.getTrip(trip)!.days).toHaveLength(2)
    expect(s.getTrip(trip)!.days[1].label).toBe('Day 2')

    s.renameDay(trip, d2, { label: 'Versailles', date: '2026-06-16' })
    const day = s.getTrip(trip)!.days[1]
    expect(day.label).toBe('Versailles')
    expect(day.date).toBe('2026-06-16')

    s.removeDay(trip, d2)
    expect(s.getTrip(trip)!.days).toHaveLength(1)
  })

  it('focusDay records which day the map shows', () => {
    const s = new TripStore(genId)
    const trip = s.createTrip('T')
    const d2 = s.addDay(trip)
    s.focusDay(d2)
    expect(s.getState().focusedDayId).toBe(d2)
  })

  it('removing the focused day re-focuses the first remaining day of the trip', () => {
    const s = new TripStore(genId)
    const trip = s.createTrip('T')
    const d2 = s.addDay(trip)
    s.focusDay(d2)
    s.removeDay(trip, d2)
    expect(s.getState().focusedDayId).toBe(s.getTrip(trip)!.days[0].id)
  })
})
