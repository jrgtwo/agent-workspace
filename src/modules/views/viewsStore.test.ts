import { describe, it, expect } from 'vitest'
import { ViewsStore, type ViewDef } from './viewsStore'
import { buildRegistry, type PanelType } from '../../core/panelRegistry'
import type { LayoutNode, WorkspaceModule } from '../../core/types'

const mod = (id: string): WorkspaceModule => ({ id, title: id, locality: 'LOCAL', tools: [], render: () => null as never })
const reg = buildRegistry([
  { id: 'file-tree', label: 'File tree', icon: '📁', module: mod('file-tree') } as PanelType,
  { id: 'ai-chat', label: 'AI chat', icon: '💬', module: mod('ai-chat') } as PanelType,
])
const treeLayout: LayoutNode = { type: 'panel', moduleId: 'file-tree' }
const builtIns = (): ViewDef[] => [{ id: 'editor', name: 'Editor', icon: '🗂', layout: treeLayout, builtIn: true }]

describe('ViewsStore', () => {
  it('seeds built-ins and a default active id', () => {
    const s = new ViewsStore(builtIns(), reg)
    expect(s.getState().views.map((v) => v.id)).toEqual(['editor'])
    expect(s.getState().activeId).toBe('editor')
  })

  it('creates, renames, and deletes user views', () => {
    const s = new ViewsStore(builtIns(), reg)
    const id = s.createView('Mine', treeLayout)
    expect(s.getState().views.find((v) => v.id === id)?.name).toBe('Mine')
    s.renameView(id, 'Yours')
    expect(s.getState().views.find((v) => v.id === id)?.name).toBe('Yours')
    s.deleteView(id)
    expect(s.getState().views.find((v) => v.id === id)).toBeUndefined()
  })

  it('does not delete built-ins', () => {
    const s = new ViewsStore(builtIns(), reg)
    s.deleteView('editor')
    expect(s.getState().views.find((v) => v.id === 'editor')).toBeDefined()
  })

  it('prunes layout panels missing from the registry on hydrate', () => {
    const s = new ViewsStore(builtIns(), reg)
    const dirty: LayoutNode = { type: 'split', direction: 'horizontal', children: [
      { type: 'panel', moduleId: 'file-tree' }, { type: 'panel', moduleId: 'ghost' },
    ] }
    s.hydrate({ views: [{ id: 'u1', name: 'U', icon: '★', layout: dirty }], activeId: 'u1' })
    const v = s.getState().views.find((x) => x.id === 'u1')!
    expect(collectIds(v.layout)).toEqual(['file-tree'])
  })

  it('re-injects built-ins missing from saved state on hydrate', () => {
    const s = new ViewsStore(builtIns(), reg)
    s.hydrate({ views: [{ id: 'u1', name: 'U', icon: '★', layout: treeLayout }], activeId: 'u1' })
    expect(s.getState().views.some((v) => v.id === 'editor')).toBe(true)
  })
})

function collectIds(n: LayoutNode): string[] {
  return n.type === 'panel' ? [n.moduleId] : n.children.flatMap(collectIds)
}

// ---- Persistence round-trip ----
import { MemoryBackend } from '../../core/storage/memoryBackend'
import { StorageService } from '../../core/storage/storage'
import { persistState } from '../../core/storage/persistState'

it('round-trips through persistState', async () => {
  const backend = new MemoryBackend()
  const storage = new StorageService(backend)
  const a = new ViewsStore(builtIns(), reg)
  await persistState(a, storage.scope('views'), 'all', 0)
  const id = a.createView('Mine', treeLayout)
  await new Promise((r) => setTimeout(r, 5))
  const b = new ViewsStore(builtIns(), reg)
  await persistState(b, storage.scope('views'), 'all', 0)
  expect(b.getState().views.find((v) => v.id === id)?.name).toBe('Mine')
})
