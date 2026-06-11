import { describe, it, expect } from 'vitest'
import { createServices } from '../app/services'
import { MemoryBackend } from '../core/storage/memoryBackend'

describe('trip agent integration', () => {
  it('accepting a propose_stops proposal writes the stops into the trip', async () => {
    const services = await createServices({
      backend: new MemoryBackend(),
      client: { chat: async () => ({ content: 'ok', toolCalls: [] }) },
    })
    const trip = services.trip
    const tripId = trip.getState().activeId!
    const dayId = trip.getTrip(tripId)!.days[0].id

    const id = services.proposals.propose({
      moduleId: 'trip',
      summary: 'Add 1 stop',
      payload: { kind: 'add-stops', tripId, dayId, stops: [{ name: 'Louvre', lat: 48.86, lng: 2.33 }] },
    })
    const change = services.proposals.forModule('trip').find((c) => c.id === id)!
    expect(services.applier.accept(change)).toBe(true)
    expect(trip.getTrip(tripId)!.days[0].stops.map((s) => s.name)).toContain('Louvre')
    expect(services.proposals.forModule('trip')).toHaveLength(0)
  })
})
