import { describe, it, expect } from 'vitest'
import { KanbanStore } from './kanbanStore'
import { KanbanNavStore } from './kanbanNavStore'
import { ProposalStore } from '../../core/proposalStore'
import { describeKanbanContext } from './context'

function setup() {
  let n = 0
  const store = new KanbanStore(() => `id-${++n}`, () => 0)
  const nav = new KanbanNavStore()
  const proposals = new ProposalStore(() => `c-${++n}`)
  return { store, nav, proposals }
}

describe('describeKanbanContext', () => {
  it('on the boards list, names existing boards and points at open_board', () => {
    const { store, nav, proposals } = setup()
    store.createProject({ name: 'Movement' })
    store.createProject({ name: 'Roadmap' })

    const ctx = describeKanbanContext(store, nav, proposals)

    expect(ctx).toMatch(/boards list/i)
    expect(ctx).toContain('Movement')
    expect(ctx).toContain('Roadmap')
    expect(ctx).toContain('open_board')
  })

  it('with a board open, names it and lists columns with card counts', () => {
    const { store, nav, proposals } = setup()
    const pid = store.createProject({ name: 'Movement' })
    nav.openBoard({ projectId: pid })
    const backlog = store.columnsForScope({ projectId: pid })[0]
    store.createCard({ projectId: pid }, backlog.id, { title: 'Walk' })
    store.createCard({ projectId: pid }, backlog.id, { title: 'Run' })

    const ctx = describeKanbanContext(store, nav, proposals)

    expect(ctx).toContain('Movement')
    expect(ctx).toMatch(/Backlog \(2\)/)
  })

  it('lists sub-boards on the current board and tells the agent to open_board into them first', () => {
    const { store, nav, proposals } = setup()
    const pid = store.createProject({ name: 'Movement' })
    nav.openBoard({ projectId: pid })
    const backlog = store.columnsForScope({ projectId: pid })[0]
    store.createCard({ projectId: pid }, backlog.id, { title: 'States', type: 'subboard' })

    const ctx = describeKanbanContext(store, nav, proposals)

    expect(ctx).toMatch(/sub-board/i)
    expect(ctx).toContain('States')
    expect(ctx).toMatch(/open_board.*subboard/i)
  })

  it('lists cards the agent has already PROPOSED (pending) so it does not re-add them', () => {
    const { store, nav, proposals } = setup()
    const pid = store.createProject({ name: 'Movement' })
    nav.openBoard({ projectId: pid })
    const backlog = store.columnsForScope({ projectId: pid })[0]
    proposals.propose({
      moduleId: 'kanban-board',
      summary: 's',
      payload: { kind: 'create-cards', cards: [{ scope: { projectId: pid }, columnId: backlog.id, input: { title: 'Walk' } }] },
    })

    const ctx = describeKanbanContext(store, nav, proposals)

    expect(ctx).toMatch(/already proposed/i)
    expect(ctx).toContain('Walk')
    expect(ctx).toMatch(/do NOT propose these again/i)
  })
})
