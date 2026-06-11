import { describe, it, expect } from 'vitest'
import { TripStore } from './tripStore'
import { describeTripContext } from './context'

let n = 0
const genId = () => `c-${++n}`

describe('describeTripContext', () => {
  it('summarizes the active trip, focused day, stop counts, and maps flag', () => {
    const s = new TripStore(genId)
    const t = s.createTrip('Paris')
    const day = s.getTrip(t)!.days[0].id
    s.addStop(t, day, { name: 'Louvre' })
    const text = describeTripContext(s)
    expect(text).toMatch(/Paris/)
    expect(text).toMatch(/Day 1/)
    expect(text).toMatch(/maps are OFF/i)
  })

  it('reports when no trip is selected', () => {
    const s = new TripStore(genId)
    expect(describeTripContext(s)).toMatch(/no trip/i)
  })
})
