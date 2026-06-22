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
    expect(s.registry.has('ai-chat')).toBe(false)
  })

  it('exposes a dock store and preview renderers', async () => {
    const s = await createServices({ client: fakeClient, backend: new MemoryBackend(), mcpClient: fakeMcp })
    expect(s.dockStore.getState()).toEqual({ collapsed: false, width: 360, openDrawer: null })
    expect(Object.keys(s.previewRenderers).sort()).toEqual(['connectors', 'graph', 'kanban', 'notes', 'trip'])
  })

  it('registers kanban and trip panels in the registry', async () => {
    const s = await createServices({ client: fakeClient, backend: new MemoryBackend(), mcpClient: fakeMcp })
    expect(s.registry.has('kanban-board')).toBe(true)
    expect(s.registry.has('trip-map')).toBe(true)
    expect(s.registry.has('trip-day-strip')).toBe(true)
    // each entry's module .id matches its registry key (PanelArea lookup contract)
    expect(s.registry.get('kanban-board')!.module.id).toBe('kanban-board')
    expect(s.registry.get('trip-map')!.module.id).toBe('trip-map')
    expect(s.registry.get('trip-day-strip')!.module.id).toBe('trip-day-strip')
  })
})
