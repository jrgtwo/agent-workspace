import { describe, it, expect } from 'vitest'
import { createServices } from './services'
import { MemoryBackend } from '../core/storage/memoryBackend'

const stub = { chat: async () => ({ content: '', toolCalls: [] }) }

describe('persisted-entity ids are collision-resistant', () => {
  it('documents and orchestrator sessions get non-sequential, unique ids (not the resettable id-N counter)', async () => {
    const services = await createServices({ backend: new MemoryBackend(), client: stub })
    await services.library.create('A.md')
    await services.sessionStore.create()
    const ids = [
      ...services.library.getState().docs.map((d) => d.id),
      ...services.sessionStore.getState().sessions.map((s) => s.id),
    ]
    // `id-<n>` resets to 1 on every reload and would collide with prior-session entities.
    for (const id of ids) expect(id).not.toMatch(/^id-\d+$/)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
