import { describe, it, expect } from 'vitest'
import { createServices } from '../app/services'
import { MemoryBackend } from '../core/storage/memoryBackend'

describe('trip feature', () => {
  it('is registered and starts with one trip after services init', async () => {
    const services = await createServices({
      backend: new MemoryBackend(),
      client: { chat: async () => ({ content: 'ok', toolCalls: [] }) },
    })
    const trip = services.features.find((f) => f.id === 'trip')
    expect(trip).toBeDefined()
    expect(trip!.modules.some((m) => m.id === 'trip-day-strip')).toBe(true)
    expect(services.trip.getState().trips).toHaveLength(1)
  })
})
