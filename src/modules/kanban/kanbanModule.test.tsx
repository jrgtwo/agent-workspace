import { describe, it, expect, beforeEach } from 'vitest'
import { createKanbanModule } from './kanbanModule'
import { KanbanStore } from './kanbanStore'
import { KanbanNavStore } from './kanbanNavStore'
import type { ToolDef } from '../../core/types'

let seq = 0
const genId = () => `id-${++seq}`

function setup() {
  seq = 0
  const store = new KanbanStore(genId, () => 1)
  const nav = new KanbanNavStore()
  const mod = createKanbanModule(store, nav)
  const tool = (name: string) => mod.tools.find((t) => t.name === name) as ToolDef
  return { store, nav, mod, tool }
}

describe('createKanbanModule', () => {
  let s: ReturnType<typeof setup>
  beforeEach(() => {
    s = setup()
  })

  it('declares the module shape and LOCAL gated tools', () => {
    expect(s.mod.id).toBe('kanban-board')
    expect(s.mod.locality).toBe('LOCAL')
    for (const name of ['list_board', 'create_card', 'move_card']) {
      const p = s.tool(name).permission
      expect(p?.resource).toBe('kanban-board')
      expect(p?.locality).toBe('LOCAL')
    }
    expect(s.tool('list_board').permission?.kind).toBe('read')
    expect(s.tool('create_card').permission?.kind).toBe('write')
    expect(s.tool('move_card').permission?.kind).toBe('write')
  })

  it('tools no-op with a friendly message when no board is open', () => {
    expect(s.tool('list_board').handler({})).toMatchObject({ ok: false })
    expect(s.tool('create_card').handler({ columnName: 'Backlog', title: 'x' })).toMatchObject({
      ok: false,
    })
    expect(s.tool('move_card').handler({ toColumnName: 'Done' })).toMatchObject({ ok: false })
  })

  it('list_board returns the active board columns + cards', () => {
    const pid = s.store.createProject({ name: 'Roadmap' })
    s.nav.openBoard({ projectId: pid })
    const backlog = s.store.columnsForScope({ projectId: pid })[0]
    s.store.createCard({ projectId: pid }, backlog.id, { title: 'Ship it' })

    const res = s.tool('list_board').handler({}) as {
      ok: boolean
      board: string
      columns: { column: string; cards: { title: string }[] }[]
    }
    expect(res.ok).toBe(true)
    expect(res.board).toBe('Roadmap')
    expect(res.columns[0]).toEqual({
      column: 'Backlog',
      cards: [{ id: expect.any(String), title: 'Ship it', type: 'task' }],
    })
  })

  it('create_card resolves the column by name (case-insensitive) and rejects unknown columns', () => {
    const pid = s.store.createProject({ name: 'P' })
    s.nav.openBoard({ projectId: pid })

    const ok = s.tool('create_card').handler({ columnName: 'in progress', title: 'Task A' }) as {
      ok: boolean
    }
    expect(ok.ok).toBe(true)
    const ip = s.store.columnsForScope({ projectId: pid }).find((c) => c.name === 'In Progress')!
    expect(s.store.cardsInColumn(ip.id).map((c) => c.title)).toEqual(['Task A'])

    const bad = s.tool('create_card').handler({ columnName: 'Nope', title: 'x' }) as {
      ok: boolean
      error: string
    }
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('Backlog')
  })

  it('create_card can create a sub-board and seeds its nested columns', () => {
    const pid = s.store.createProject({ name: 'P' })
    s.nav.openBoard({ projectId: pid })

    const res = s.tool('create_card').handler({
      columnName: 'Backlog',
      title: 'Epic',
      type: 'subboard',
    }) as { ok: boolean; id: string }
    expect(res.ok).toBe(true)
    expect(s.store.getCard(res.id)!.type).toBe('subboard')
    // its nested board is ready to use
    expect(s.store.columnsForScope({ projectId: pid, parentCardId: res.id })).toHaveLength(4)
  })

  it('create_board is a gated write that creates a new project with default columns', () => {
    expect(s.tool('create_board').permission?.kind).toBe('write')
    const res = s.tool('create_board').handler({ name: 'Home Reno' }) as { ok: boolean; id: string }
    expect(res.ok).toBe(true)
    const proj = s.store.getProject(res.id)!
    expect(proj.name).toBe('Home Reno')
    expect(s.store.columnsForScope({ projectId: res.id })).toHaveLength(4)
  })

  it('move_card moves by title and reports ambiguity', () => {
    const pid = s.store.createProject({ name: 'P' })
    s.nav.openBoard({ projectId: pid })
    const cols = s.store.columnsForScope({ projectId: pid })
    s.store.createCard({ projectId: pid }, cols[0].id, { title: 'Solo' })

    const moved = s.tool('move_card').handler({ cardTitle: 'Solo', toColumnName: 'Done' }) as {
      ok: boolean
    }
    expect(moved.ok).toBe(true)
    const done = cols.find((c) => c.name === 'Done')!
    expect(s.store.cardsInColumn(done.id).map((c) => c.title)).toEqual(['Solo'])

    s.store.createCard({ projectId: pid }, cols[0].id, { title: 'Dup' })
    s.store.createCard({ projectId: pid }, cols[1].id, { title: 'Dup' })
    const amb = s.tool('move_card').handler({ cardTitle: 'Dup', toColumnName: 'Review' }) as {
      ok: boolean
      error: string
    }
    expect(amb.ok).toBe(false)
    expect(amb.error).toContain('Multiple')
  })
})
