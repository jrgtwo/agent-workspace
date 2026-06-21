import { describe, it, expect, vi } from 'vitest'
import { createServices } from './services'
import { MemoryBackend } from '../core/storage/memoryBackend'

const fakeClient = { chat: vi.fn() }
const fakeMcp = { listTools: vi.fn().mockResolvedValue([]), call: vi.fn() }

describe('orchestrator delegation parity', () => {
  it('can delegate to every feature including connectors and graph', async () => {
    const s = await createServices({ client: fakeClient, backend: new MemoryBackend(), mcpClient: fakeMcp })
    const ids = [...s.featureAgents.keys()].sort()
    expect(ids).toEqual(['connectors', 'graph', 'kanban', 'notes', 'search', 'trip'])
    for (const id of ['connectors', 'graph']) {
      const agent = s.featureAgents.get(id)!
      expect(agent.description.length).toBeGreaterThan(0)
      expect(agent.registry).toBeDefined()
    }
  })
})
