import { describe, it, expect, vi } from 'vitest'
import { createServices } from './services'
import { MemoryBackend } from '../core/storage/memoryBackend'

const fakeClient = { chat: vi.fn() }
const fakeMcp = { listTools: vi.fn().mockResolvedValue([]), call: vi.fn() }

describe('composable views wiring', () => {
  it('exposes a panel registry and the default views', async () => {
    const s = await createServices({ client: fakeClient, backend: new MemoryBackend(), mcpClient: fakeMcp })
    expect(s.viewsStore.getState().views.map((v) => v.id)).toEqual(['editor', 'reader'])
    expect(s.registry.has('connectors-tree')).toBe(true)
    expect(s.registry.has('connectors-viewer')).toBe(true)
    expect(s.registry.has('ai-chat')).toBe(true)
  })
})
