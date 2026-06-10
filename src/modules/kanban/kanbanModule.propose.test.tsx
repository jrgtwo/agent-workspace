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
  it('create_cards does NOT re-propose a card already pending for the column, but allows distinct titles', () => {
    const { store, nav, proposals, tool } = build()
    const pid = store.createProject({ name: 'P' })
    nav.openBoard({ projectId: pid })
    const col = store.columnsForScope({ projectId: pid })[0]

    // First call proposes successfully.
    tool('create_cards').handler({ cards: [{ columnName: col.name, title: 'Waimea Canyon' }] })
    // Second call with same title (case-insensitive) is skipped → proposed:false, skipped non-empty.
    const dupe = tool('create_cards').handler({ cards: [{ columnName: col.name, title: 'waimea canyon' }] }) as { proposed: boolean; skipped: string[] }
    expect(dupe.proposed).toBe(false)
    expect(dupe.skipped.length).toBeGreaterThan(0)
    expect(proposals.forModule('kanban-board')).toHaveLength(1) // not duplicated (case-insensitive match)

    // A different title is still proposed (distinct cards are fine).
    tool('create_cards').handler({ cards: [{ columnName: col.name, title: 'Hanalei Bay' }] })
    expect(proposals.forModule('kanban-board')).toHaveLength(2)

    // Once the pending one is resolved, the same title may be proposed again (committed dupes are allowed).
    const waimea = proposals.forModule('kanban-board').find((c) => {
      const p = c.payload as KanbanProposalPayload
      return p.kind === 'create-cards' && p.cards.some((e) => e.input.title === 'Waimea Canyon')
    })!
    proposals.remove(waimea.id)
    tool('create_cards').handler({ cards: [{ columnName: col.name, title: 'Waimea Canyon' }] })
    expect(proposals.forModule('kanban-board')).toHaveLength(2)

    // Within-batch dedupe: a single call with two identical titles only creates ONE card in the proposal.
    const { store: s2, nav: n2, proposals: p2, tool: t2 } = build()
    const pid2 = s2.createProject({ name: 'Q' })
    n2.openBoard({ projectId: pid2 })
    const col2 = s2.columnsForScope({ projectId: pid2 })[0]
    t2('create_cards').handler({ cards: [{ columnName: col2.name, title: 'Dup' }, { columnName: col2.name, title: 'dup' }] })
    const batch = p2.forModule('kanban-board')
    expect(batch).toHaveLength(1)
    const batchPayload = batch[0].payload as KanbanProposalPayload & { kind: 'create-cards' }
    expect(batchPayload.cards).toHaveLength(1)
  })

  it('create_cards enqueues a kanban-board proposal and does not add the card until accepted', () => {
    const { store, nav, proposals, tool } = build()
    const pid = store.createProject({ name: 'P' })
    nav.openBoard({ projectId: pid })
    const col = store.columnsForScope({ projectId: pid })[0]
    const res = tool('create_cards').handler({ cards: [{ columnName: col.name, title: 'Draft' }] })
    expect(res).toMatchObject({ proposed: true })
    expect(store.cardsInColumn(col.id)).toHaveLength(0)
    const pending = proposals.forModule('kanban-board')
    expect(pending).toHaveLength(1)
    expect((pending[0].payload as KanbanProposalPayload).kind).toBe('create-cards')
  })

  it('create_cards has no permission gate', () => {
    const { tool } = build()
    expect(tool('create_cards').permission).toBeUndefined()
  })

  it('create_cards skips a card with an unknown column (does not hard-error)', () => {
    const { store, nav, tool } = build()
    const pid = store.createProject({ name: 'P' })
    nav.openBoard({ projectId: pid })
    const res = tool('create_cards').handler({ cards: [{ columnName: 'Nope', title: 'X' }] }) as { ok?: boolean; proposed?: boolean; skipped?: string[] }
    expect(res.ok).toBe(true)
    expect(res.proposed).toBe(false)
    expect(res.skipped!.length).toBeGreaterThan(0)
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

  it('create_cards skips a blank title (does not propose)', () => {
    const { store, nav, proposals, tool } = build()
    const pid = store.createProject({ name: 'P' })
    nav.openBoard({ projectId: pid })
    const col = store.columnsForScope({ projectId: pid })[0]
    const res = tool('create_cards').handler({ cards: [{ columnName: col.name, title: '   ' }] }) as { ok?: boolean; proposed?: boolean; skipped?: string[] }
    // blank titles are skipped → all cards skipped → proposed:false
    expect(res.proposed).toBe(false)
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
