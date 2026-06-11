import { describe, it, expect } from 'vitest'
import { TripStore } from './tripStore'

let n = 0
const genId = () => `p-${++n}`

describe('TripStore.applyProposal', () => {
  it('appends proposed stops to the named day', () => {
    const s = new TripStore(genId)
    const t = s.createTrip('Paris')
    const day = s.getTrip(t)!.days[0].id
    const ok = s.applyProposal({
      kind: 'add-stops',
      tripId: t,
      dayId: day,
      stops: [{ name: 'Louvre', lat: 48.86, lng: 2.33 }, { name: 'Orsay' }],
    })
    expect(ok).toBe(true)
    expect(s.getTrip(t)!.days[0].stops.map((x) => x.name)).toEqual(['Louvre', 'Orsay'])
  })

  it('returns false when the trip or day is gone', () => {
    const s = new TripStore(genId)
    expect(s.applyProposal({ kind: 'add-stops', tripId: 'nope', dayId: 'x', stops: [] })).toBe(false)
  })
})

describe('TripStore.buildItinerary / build-itinerary proposal', () => {
  it('applies a build-itinerary proposal as a new active trip with days and stops', () => {
    let k = 0
    const s = new TripStore(() => `b-${++k}`)
    const ok = s.applyProposal({
      kind: 'build-itinerary',
      title: 'Maui',
      days: [
        { label: 'Day 1', stops: [{ name: 'Haleakalā' }, { name: 'Road to Hana' }] },
        { label: 'Day 2', stops: [{ name: 'Molokini' }] },
      ],
    })
    expect(ok).toBe(true)
    const trip = s.getActiveTrip()!
    expect(trip.title).toBe('Maui')
    expect(trip.days).toHaveLength(2)
    expect(trip.days[0].stops.map((x) => x.name)).toEqual(['Haleakalā', 'Road to Hana'])
    expect(s.getState().focusedDayId).toBe(trip.days[0].id)
  })
})
