import { describe, it, expect, vi } from 'vitest'
import { createServices } from '../app/services'
import { MemoryBackend } from '../core/storage/memoryBackend'
import type { LayoutNode } from '../core/types'

const stubClient = { chat: vi.fn() }

function panelIds(node: LayoutNode): { id: string; draggable?: boolean }[] {
  if (node.type === 'panel') return [{ id: node.moduleId, draggable: node.draggable }]
  return node.children.flatMap(panelIds)
}

describe('Kanban board feature wiring', () => {
  it('registers the 📋 Kanban feature with a board + chat layout and a layout store', async () => {
    const services = await createServices({ client: stubClient, backend: new MemoryBackend() })

    const board = services.features.find((f) => f.id === 'kanban')
    expect(board).toBeDefined()
    expect(board!.name).toBe('Kanban')
    expect(board!.icon).toBe('📋')

    expect(board!.modules.map((m) => m.id).sort()).toEqual(['ai-chat', 'kanban-board'])

    const panels = panelIds(board!.layout)
    expect(panels.map((p) => p.id).sort()).toEqual(['ai-chat', 'kanban-board'])
    expect(panels.every((p) => p.draggable)).toBe(true)

    expect(services.layoutStores.has('kanban')).toBe(true)
    expect(services.kanban).toBeDefined()
    expect(services.kanbanNav).toBeDefined()
  })

  it('exposes the kanban agent tools through the board module', async () => {
    const services = await createServices({ client: stubClient, backend: new MemoryBackend() })
    const board = services.features.find((f) => f.id === 'kanban')!
    const mod = board.modules.find((m) => m.id === 'kanban-board')!
    expect(mod.tools.map((t) => t.name).sort()).toEqual(['create_board', 'create_card', 'list_board', 'move_card', 'open_board'])
  })
})
