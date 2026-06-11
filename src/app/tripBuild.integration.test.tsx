import { describe, it, expect } from 'vitest'
import { createServices } from '../app/services'
import { MemoryBackend } from '../core/storage/memoryBackend'

describe('trip build integration (create_itinerary → accept)', () => {
  it('accepting a build-itinerary proposal creates a new populated active trip', async () => {
    const services = await createServices({
      backend: new MemoryBackend(),
      client: { chat: async () => ({ content: 'ok', toolCalls: [] }) },
    })
    const before = services.trip.getState().trips.length

    const id = services.proposals.propose({
      moduleId: 'trip',
      summary: 'Create itinerary "Maui": 2 days, 3 stops',
      payload: {
        kind: 'build-itinerary',
        title: 'Maui',
        days: [
          { label: 'Day 1', stops: [{ name: 'Haleakalā' }, { name: 'Road to Hana' }] },
          { label: 'Day 2', stops: [{ name: 'Molokini' }] },
        ],
      },
    })
    const change = services.proposals.forModule('trip').find((c) => c.id === id)!
    expect(services.applier.accept(change)).toBe(true)

    const trips = services.trip.getState().trips
    expect(trips.length).toBe(before + 1)
    const active = services.trip.getActiveTrip()!
    expect(active.title).toBe('Maui')
    expect(active.days).toHaveLength(2)
    expect(active.days[0].stops.map((s) => s.name)).toEqual(['Haleakalā', 'Road to Hana'])
    expect(active.days[1].stops.map((s) => s.name)).toEqual(['Molokini'])
    expect(services.proposals.forModule('trip')).toHaveLength(0)
  })
})
