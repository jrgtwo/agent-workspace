import { describe, it, expect } from 'vitest'
import { createKanbanModule } from './kanbanModule'
import { KanbanStore } from './kanbanStore'
import { KanbanNavStore } from './kanbanNavStore'
import { ProposalStore } from '../../core/proposalStore'
import { ProposalApplier } from '../../core/proposalApplier'
import type { KanbanProposalPayload } from './types'

function build() {
  let n = 0
  const store = new KanbanStore(() => `k-${++n}`, () => 0)
  const nav = new KanbanNavStore()
  const proposals = new ProposalStore(() => `c-${++n}`)
  const applier = new ProposalApplier(proposals)
  const mod = createKanbanModule(store, nav, proposals, applier)
  const tool = (name: string) => mod.tools.find((t) => t.name === name)!
  return { store, nav, proposals, tool }
}

describe('kanban tools propose instead of mutating', () => {
  it('create_card enqueues a kanban-board proposal and does not add the card until accepted', () => {
    const { store, nav, proposals, tool } = build()
    const pid = store.createProject({ name: 'P' })
    nav.openBoard({ projectId: pid })
    const col = store.columnsForScope({ projectId: pid })[0]
    const res = tool('create_card').handler({ columnName: col.name, title: 'Draft' })
    expect(res).toMatchObject({ proposed: true })
    expect(store.cardsInColumn(col.id)).toHaveLength(0)
    const pending = proposals.forModule('kanban-board')
    expect(pending).toHaveLength(1)
    expect((pending[0].payload as KanbanProposalPayload).kind).toBe('create-card')
  })

  it('create_card has no permission gate', () => {
    const { tool } = build()
    expect(tool('create_card').permission).toBeUndefined()
  })

  it('create_card still validates the column name before proposing', () => {
    const { store, nav, tool } = build()
    const pid = store.createProject({ name: 'P' })
    nav.openBoard({ projectId: pid })
    const res = tool('create_card').handler({ columnName: 'Nope', title: 'X' }) as { ok?: boolean; error?: string }
    expect(res.ok).toBe(false)
    expect(res.error).toContain('No column')
  })

  it('create_board enqueues a kanban-project proposal', () => {
    const { proposals, tool } = build()
    const res = tool('create_board').handler({ name: 'New Board' })
    expect(res).toMatchObject({ proposed: true })
    expect(proposals.forModule('kanban-project')).toHaveLength(1)
  })

  it('move_card enqueues a kanban-board move proposal', () => {
    const { store, nav, proposals, tool } = build()
    const pid = store.createProject({ name: 'P' })
    nav.openBoard({ projectId: pid })
    const [a, b] = store.columnsForScope({ projectId: pid })
    store.createCard({ projectId: pid }, a.id, { title: 'X' })
    const res = tool('move_card').handler({ cardTitle: 'X', toColumnName: b.name })
    expect(res).toMatchObject({ proposed: true })
    const payload = proposals.forModule('kanban-board')[0].payload as KanbanProposalPayload
    expect(payload.kind).toBe('move-card')
  })

  it('create_card rejects a blank title before proposing', () => {
    const { store, nav, proposals, tool } = build()
    const pid = store.createProject({ name: 'P' })
    nav.openBoard({ projectId: pid })
    const col = store.columnsForScope({ projectId: pid })[0]
    const res = tool('create_card').handler({ columnName: col.name, title: '   ' }) as { ok?: boolean; error?: string }
    expect(res.ok).toBe(false)
    expect(res.error).toContain('title')
    expect(proposals.forModule('kanban-board')).toHaveLength(0)
  })

  it('create_board rejects a blank name before proposing', () => {
    const { proposals, tool } = build()
    const res = tool('create_board').handler({ name: '   ' }) as { ok?: boolean; error?: string }
    expect(res.ok).toBe(false)
    expect(res.error).toContain('name')
    expect(proposals.forModule('kanban-project')).toHaveLength(0)
  })

  it('move_card errors when the card is not found and does not propose', () => {
    const { store, nav, proposals, tool } = build()
    const pid = store.createProject({ name: 'P' })
    nav.openBoard({ projectId: pid })
    const [, b] = store.columnsForScope({ projectId: pid })
    const res = tool('move_card').handler({ cardTitle: 'ghost', toColumnName: b.name }) as { ok?: boolean; error?: string }
    expect(res.ok).toBe(false)
    expect(res.error).toContain('not found')
    expect(proposals.forModule('kanban-board')).toHaveLength(0)
  })

  it('move_card errors on an unknown destination column and does not propose', () => {
    const { store, nav, proposals, tool } = build()
    const pid = store.createProject({ name: 'P' })
    nav.openBoard({ projectId: pid })
    const [a] = store.columnsForScope({ projectId: pid })
    store.createCard({ projectId: pid }, a.id, { title: 'X' })
    const res = tool('move_card').handler({ cardTitle: 'X', toColumnName: 'Nope' }) as { ok?: boolean; error?: string }
    expect(res.ok).toBe(false)
    expect(res.error).toContain('No column')
    expect(proposals.forModule('kanban-board')).toHaveLength(0)
  })
})
