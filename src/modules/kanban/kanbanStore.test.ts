import { describe, it, expect, beforeEach } from 'vitest'
import { KanbanStore } from './kanbanStore'
import type { Scope } from './types'

let seq = 0
const genId = () => `id-${++seq}`
let now = 0
const clock = () => ++now

function freshStore() {
  seq = 0
  now = 0
  return new KanbanStore(genId, clock)
}

describe('KanbanStore', () => {
  let store: KanbanStore
  beforeEach(() => {
    store = freshStore()
  })

  it('createProject adds a project seeded with the 4 default columns', () => {
    const pid = store.createProject({ name: 'Roadmap' })
    const scope: Scope = { projectId: pid }
    expect(store.getProject(pid)?.name).toBe('Roadmap')
    expect(store.columnsForScope(scope).map((c) => c.name)).toEqual([
      'Backlog',
      'In Progress',
      'Review',
      'Done',
    ])
    expect(store.columnsForScope(scope).map((c) => c.order)).toEqual([0, 1, 2, 3])
  })

  it('createCard appends to a column with incrementing order', () => {
    const pid = store.createProject({ name: 'P' })
    const scope: Scope = { projectId: pid }
    const col = store.columnsForScope(scope)[0]
    const a = store.createCard(scope, col.id, { title: 'A' })
    const b = store.createCard(scope, col.id, { title: 'B' })
    const cards = store.cardsInColumn(col.id)
    expect(cards.map((c) => c.id)).toEqual([a, b])
    expect(cards.map((c) => c.order)).toEqual([0, 1])
    expect(cards[0].type).toBe('task')
  })

  it('moveCard reorders within the same column', () => {
    const pid = store.createProject({ name: 'P' })
    const scope: Scope = { projectId: pid }
    const col = store.columnsForScope(scope)[0]
    const a = store.createCard(scope, col.id, { title: 'A' })
    const b = store.createCard(scope, col.id, { title: 'B' })
    const c = store.createCard(scope, col.id, { title: 'C' })
    store.moveCard(c, col.id, 0) // C to front
    expect(store.cardsInColumn(col.id).map((x) => x.id)).toEqual([c, a, b])
    expect(store.cardsInColumn(col.id).map((x) => x.order)).toEqual([0, 1, 2])
  })

  it('moveCard across columns repacks both source and destination', () => {
    const pid = store.createProject({ name: 'P' })
    const scope: Scope = { projectId: pid }
    const [backlog, inProgress] = store.columnsForScope(scope)
    const a = store.createCard(scope, backlog.id, { title: 'A' })
    const b = store.createCard(scope, backlog.id, { title: 'B' })
    store.moveCard(a, inProgress.id, 0)
    expect(store.cardsInColumn(backlog.id).map((x) => x.id)).toEqual([b])
    expect(store.cardsInColumn(backlog.id)[0].order).toBe(0)
    const moved = store.cardsInColumn(inProgress.id)
    expect(moved.map((x) => x.id)).toEqual([a])
    expect(moved[0].columnId).toBe(inProgress.id)
  })

  it('deleteCard removes the card and repacks its column order', () => {
    const pid = store.createProject({ name: 'P' })
    const scope: Scope = { projectId: pid }
    const col = store.columnsForScope(scope)[0]
    const a = store.createCard(scope, col.id, { title: 'A' })
    const b = store.createCard(scope, col.id, { title: 'B' })
    const c = store.createCard(scope, col.id, { title: 'C' })
    store.deleteCard(b)
    expect(store.cardsInColumn(col.id).map((x) => x.id)).toEqual([a, c])
    expect(store.cardsInColumn(col.id).map((x) => x.order)).toEqual([0, 1])
  })

  it('deleteColumn removes the column, its cards, and repacks remaining columns', () => {
    const pid = store.createProject({ name: 'P' })
    const scope: Scope = { projectId: pid }
    const cols = store.columnsForScope(scope)
    store.createCard(scope, cols[1].id, { title: 'X' })
    store.deleteColumn(cols[1].id)
    const remaining = store.columnsForScope(scope)
    expect(remaining.map((c) => c.name)).toEqual(['Backlog', 'Review', 'Done'])
    expect(remaining.map((c) => c.order)).toEqual([0, 1, 2])
    expect(store.cardsInColumn(cols[1].id)).toEqual([])
  })

  it('reorderColumns applies the given order', () => {
    const pid = store.createProject({ name: 'P' })
    const scope: Scope = { projectId: pid }
    const ids = store.columnsForScope(scope).map((c) => c.id)
    store.reorderColumns([ids[3], ids[2], ids[1], ids[0]])
    expect(store.columnsForScope(scope).map((c) => c.id)).toEqual([
      ids[3],
      ids[2],
      ids[1],
      ids[0],
    ])
  })

  it('deleteProject removes its projects, columns, and cards', () => {
    const p1 = store.createProject({ name: 'One' })
    const p2 = store.createProject({ name: 'Two' })
    store.createCard({ projectId: p1 }, store.columnsForScope({ projectId: p1 })[0].id, { title: 'A' })
    store.deleteProject(p1)
    expect(store.getProject(p1)).toBeUndefined()
    expect(store.getState().columns.every((c) => c.projectId === p2)).toBe(true)
    expect(store.getState().cards).toEqual([])
  })

  it('updateCard sets the description (notes) and can change the card type', () => {
    const pid = store.createProject({ name: 'P' })
    const scope: Scope = { projectId: pid }
    const col = store.columnsForScope(scope)[0]
    const id = store.createCard(scope, col.id, { title: 'A' })
    store.updateCard(id, { notes: 'A longer description', type: 'subboard' })
    const card = store.getCard(id)!
    expect(card.notes).toBe('A longer description')
    expect(card.type).toBe('subboard')
  })

  it('ensureBoardColumns seeds default columns for a sub-board, idempotently', () => {
    const pid = store.createProject({ name: 'P' })
    const root: Scope = { projectId: pid }
    const parent = store.createCard(root, store.columnsForScope(root)[0].id, {
      title: 'Epic',
      type: 'subboard',
    })
    const sub: Scope = { projectId: pid, parentCardId: parent }

    expect(store.columnsForScope(sub)).toEqual([])
    store.ensureBoardColumns(sub)
    expect(store.columnsForScope(sub).map((c) => c.name)).toEqual([
      'Backlog',
      'In Progress',
      'Review',
      'Done',
    ])
    store.ensureBoardColumns(sub) // idempotent
    expect(store.columnsForScope(sub)).toHaveLength(4)
  })

  it('keeps sub-board cards isolated from the root board, and reports the ancestor chain', () => {
    const pid = store.createProject({ name: 'P' })
    const root: Scope = { projectId: pid }
    const parent = store.createCard(root, store.columnsForScope(root)[0].id, {
      title: 'Epic',
      type: 'subboard',
    })
    const sub: Scope = { projectId: pid, parentCardId: parent }
    store.ensureBoardColumns(sub)
    const subCol = store.columnsForScope(sub)[0]
    store.createCard(sub, subCol.id, { title: 'Nested task' })

    // root board sees only the Epic card; sub-board sees only the nested task
    expect(store.cardsForScope(root).map((c) => c.title)).toEqual(['Epic'])
    expect(store.cardsForScope(sub).map((c) => c.title)).toEqual(['Nested task'])
    expect(store.ancestorCards(sub).map((c) => c.id)).toEqual([parent])
    expect(store.ancestorCards(root)).toEqual([])
  })

  it('deleting a sub-board card cascades its nested columns and cards', () => {
    const pid = store.createProject({ name: 'P' })
    const root: Scope = { projectId: pid }
    const parent = store.createCard(root, store.columnsForScope(root)[0].id, {
      title: 'Epic',
      type: 'subboard',
    })
    const sub: Scope = { projectId: pid, parentCardId: parent }
    store.ensureBoardColumns(sub)
    store.createCard(sub, store.columnsForScope(sub)[0].id, { title: 'Nested' })

    store.deleteCard(parent)
    expect(store.getCard(parent)).toBeUndefined()
    expect(store.columnsForScope(sub)).toEqual([])
    expect(store.getState().cards).toEqual([])
  })

  it('manages checklist items (add / toggle / remove)', () => {
    const pid = store.createProject({ name: 'P' })
    const scope: Scope = { projectId: pid }
    const col = store.columnsForScope(scope)[0]
    const id = store.createCard(scope, col.id, { title: 'List', type: 'checklist' })

    store.addChecklistItem(id, 'one')
    store.addChecklistItem(id, 'two')
    let items = store.getCard(id)!.checklistItems!
    expect(items.map((i) => i.text)).toEqual(['one', 'two'])
    expect(items.every((i) => !i.done)).toBe(true)

    store.toggleChecklistItem(id, items[0].id)
    expect(store.getCard(id)!.checklistItems![0].done).toBe(true)

    store.removeChecklistItem(id, items[1].id)
    items = store.getCard(id)!.checklistItems!
    expect(items.map((i) => i.text)).toEqual(['one'])

    store.addChecklistItem(id, '   ') // blank ignored
    expect(store.getCard(id)!.checklistItems!).toHaveLength(1)
  })

  it('hydrate replaces state and round-trips through getState', () => {
    const pid = store.createProject({ name: 'P' })
    store.createCard({ projectId: pid }, store.columnsForScope({ projectId: pid })[0].id, { title: 'A' })
    const snapshot = store.getState()

    const restored = freshStore()
    restored.hydrate(snapshot)
    expect(restored.getState()).toEqual(snapshot)
    expect(restored.columnsForScope({ projectId: pid }).map((c) => c.name)).toEqual([
      'Backlog',
      'In Progress',
      'Review',
      'Done',
    ])
  })
})
