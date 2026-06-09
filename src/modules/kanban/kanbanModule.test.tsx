import { describe, it, expect, beforeEach } from 'vitest'
import { createKanbanModule } from './kanbanModule'
import { KanbanStore } from './kanbanStore'
import { KanbanNavStore } from './kanbanNavStore'
import { ProposalStore } from '../../core/proposalStore'
import { ProposalApplier } from '../../core/proposalApplier'
import type { ToolDef } from '../../core/types'

let seq = 0
const genId = () => `id-${++seq}`

function setup() {
  seq = 0
  const store = new KanbanStore(genId, () => 1)
  const nav = new KanbanNavStore()
  const proposals = new ProposalStore(genId)
  const applier = new ProposalApplier(proposals)
  const mod = createKanbanModule(store, nav, proposals, applier)
  const tool = (name: string) => mod.tools.find((t) => t.name === name) as ToolDef
  return { store, nav, proposals, applier, mod, tool }
}

describe('createKanbanModule', () => {
  let s: ReturnType<typeof setup>
  beforeEach(() => {
    s = setup()
  })

  it('declares the module shape; list_board is read-gated, write tools have no permission gate', () => {
    expect(s.mod.id).toBe('kanban-board')
    expect(s.mod.locality).toBe('LOCAL')
    // list_board keeps its read permission gate
    expect(s.tool('list_board').permission?.kind).toBe('read')
    expect(s.tool('list_board').permission?.resource).toBe('kanban-board')
    expect(s.tool('list_board').permission?.locality).toBe('LOCAL')
    // write tools now propose; no permission gate
    expect(s.tool('create_card').permission).toBeUndefined()
    expect(s.tool('move_card').permission).toBeUndefined()
    expect(s.tool('create_board').permission).toBeUndefined()
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

  it('create_card resolves the column by name (case-insensitive), proposes, and rejects unknown columns', () => {
    const pid = s.store.createProject({ name: 'P' })
    s.nav.openBoard({ projectId: pid })

    const res = s.tool('create_card').handler({ columnName: 'in progress', title: 'Task A' }) as {
      proposed: boolean
    }
    expect(res.proposed).toBe(true)
    // card is NOT yet in the store (proposal pending)
    const ip = s.store.columnsForScope({ projectId: pid }).find((c) => c.name === 'In Progress')!
    expect(s.store.cardsInColumn(ip.id)).toHaveLength(0)

    const bad = s.tool('create_card').handler({ columnName: 'Nope', title: 'x' }) as {
      ok: boolean
      error: string
    }
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('Backlog')
  })

  it('create_card proposes a sub-board card (store unchanged until accepted)', () => {
    const pid = s.store.createProject({ name: 'P' })
    s.nav.openBoard({ projectId: pid })

    const res = s.tool('create_card').handler({
      columnName: 'Backlog',
      title: 'Epic',
      type: 'subboard',
    }) as { proposed: boolean }
    expect(res.proposed).toBe(true)
    // store is unchanged — card not created until proposal is accepted
    const col = s.store.columnsForScope({ projectId: pid })[0]
    expect(s.store.cardsInColumn(col.id)).toHaveLength(0)
  })

  it('create_board proposes a new project (store unchanged until accepted)', () => {
    expect(s.tool('create_board').permission).toBeUndefined()
    const res = s.tool('create_board').handler({ name: 'Home Reno' }) as { proposed: boolean }
    expect(res.proposed).toBe(true)
    // store is unchanged — project not created until proposal is accepted
    expect(s.store.getState().projects).toHaveLength(0)
    expect(s.proposals.forModule('kanban-project')).toHaveLength(1)
  })

  it('open_board opens a board by name and resolves the active scope', () => {
    const pid = s.store.createProject({ name: 'Website Refresh' })
    const res = s.tool('open_board').handler({ name: 'website refresh' }) as { ok: boolean }
    expect(res.ok).toBe(true)
    expect(s.nav.activeScope()?.projectId).toBe(pid)
  })

  it('open_board reports a friendly error for an unknown board', () => {
    const res = s.tool('open_board').handler({ name: 'nope' }) as { ok: boolean; error: string }
    expect(res.ok).toBe(false)
    expect(res.error).toContain('No board')
  })

  it('open_board navigates into a sub-board by title so cards can be proposed inside it', () => {
    const pid = s.store.createProject({ name: 'P' })
    s.nav.openBoard({ projectId: pid })
    // Create the subboard card directly in the store (bypassing the tool, which now only proposes)
    const col = s.store.columnsForScope({ projectId: pid })[0]
    const subId = s.store.createCard({ projectId: pid }, col.id, { title: 'Phase 1', type: 'subboard' })
    s.store.ensureBoardColumns({ projectId: pid, parentCardId: subId })
    const opened = s.tool('open_board').handler({ subboard: 'phase 1' }) as { ok: boolean }
    expect(opened.ok).toBe(true)
    expect(s.nav.activeScope()).toMatchObject({ projectId: pid, parentCardId: subId })
    // Proposing a card inside the sub-board enqueues a proposal for the active scope
    const innerRes = s.tool('create_card').handler({ columnName: 'Backlog', title: 'Inner task' }) as { proposed: boolean }
    expect(innerRes.proposed).toBe(true)
    expect(s.proposals.forModule('kanban-board')).toHaveLength(1)
  })

  it('open_board reports a friendly error for an unknown sub-board', () => {
    const pid = s.store.createProject({ name: 'P' })
    s.nav.openBoard({ projectId: pid })
    const res = s.tool('open_board').handler({ subboard: 'nope' }) as { ok: boolean; error: string }
    expect(res.ok).toBe(false)
    expect(res.error.toLowerCase()).toContain('sub-board')
  })

  it('move_card proposes a move by title and reports ambiguity without mutating', () => {
    const pid = s.store.createProject({ name: 'P' })
    s.nav.openBoard({ projectId: pid })
    const cols = s.store.columnsForScope({ projectId: pid })
    s.store.createCard({ projectId: pid }, cols[0].id, { title: 'Solo' })

    const moved = s.tool('move_card').handler({ cardTitle: 'Solo', toColumnName: 'Done' }) as {
      proposed: boolean
    }
    expect(moved.proposed).toBe(true)
    // card is NOT yet moved (proposal pending)
    const done = cols.find((c) => c.name === 'Done')!
    expect(s.store.cardsInColumn(done.id)).toHaveLength(0)
    expect(s.proposals.forModule('kanban-board')).toHaveLength(1)

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
