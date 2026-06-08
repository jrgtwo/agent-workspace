import { Emitter } from '../../core/emitter'
import type {
  Accent,
  Card,
  CardType,
  ChecklistItem,
  Column,
  KanbanState,
  Project,
  Scope,
} from './types'

const DEFAULT_COLUMNS = ['Backlog', 'In Progress', 'Review', 'Done']
const ACCENTS: Accent[] = ['vermillion', 'ochre', 'moss', 'ink']

export interface CreateCardInput {
  type?: CardType
  title: string
  notes?: string
  dueAt?: number
  checklistItems?: ChecklistItem[]
}

/**
 * KanbanStore — the board's data brain. Holds projects/columns/cards in immutable state and
 * exposes ops ported from the standalone kanban app's db layer, operating synchronously on
 * in-memory state then `notify()`-ing. Persistence is layered on by `persistState` (getState/
 * subscribe/hydrate), so this store knows nothing about storage. Mirrors the app's store pattern.
 */
export class KanbanStore extends Emitter<KanbanState> {
  private state: KanbanState = { projects: [], columns: [], cards: [] }
  private genId: () => string
  private now: () => number

  constructor(genId: () => string, now: () => number = () => Date.now()) {
    super()
    this.genId = genId
    this.now = now
  }

  getState = (): KanbanState => this.state

  hydrate(state: KanbanState): void {
    this.state = {
      projects: state.projects ?? [],
      columns: state.columns ?? [],
      cards: state.cards ?? [],
    }
    this.notify()
  }

  // ---- selectors ----
  getProject(id: string): Project | undefined {
    return this.state.projects.find((p) => p.id === id)
  }

  getCard(id: string): Card | undefined {
    return this.state.cards.find((c) => c.id === id)
  }

  /** The chain of ancestor sub-board cards for a scope, ordered root→current parent (empty for a root board). */
  ancestorCards(scope: Scope): Card[] {
    const chain: Card[] = []
    let parentCardId = scope.parentCardId
    while (parentCardId) {
      const card = this.getCard(parentCardId)
      if (!card) break
      chain.unshift(card)
      parentCardId = card.parentCardId
    }
    return chain
  }

  columnsForScope(scope: Scope): Column[] {
    return this.state.columns
      .filter((c) =>
        scope.parentCardId
          ? c.parentCardId === scope.parentCardId
          : c.projectId === scope.projectId && !c.parentCardId,
      )
      .sort((a, b) => a.order - b.order)
  }

  cardsForScope(scope: Scope): Card[] {
    return this.state.cards
      .filter((c) =>
        scope.parentCardId
          ? c.parentCardId === scope.parentCardId
          : c.projectId === scope.projectId && !c.parentCardId,
      )
      .sort((a, b) => a.order - b.order)
  }

  cardsInColumn(columnId: string): Card[] {
    return this.state.cards
      .filter((c) => c.columnId === columnId)
      .sort((a, b) => a.order - b.order)
  }

  // ---- projects ----
  createProject(input: { name: string; description?: string; accent?: Accent }): string {
    const pid = this.genId()
    const accent = input.accent ?? ACCENTS[this.state.projects.length % ACCENTS.length]
    const project: Project = {
      id: pid,
      name: input.name.trim() || 'Untitled',
      description: input.description?.trim() || undefined,
      accent,
      createdAt: this.now(),
    }
    const columns: Column[] = DEFAULT_COLUMNS.map((name, i) => ({
      id: this.genId(),
      projectId: pid,
      name,
      order: i,
    }))
    this.state = {
      ...this.state,
      projects: [...this.state.projects, project],
      columns: [...this.state.columns, ...columns],
    }
    this.notify()
    return pid
  }

  renameProject(
    projectId: string,
    patch: { name?: string; description?: string; accent?: Accent },
  ): void {
    this.state = {
      ...this.state,
      projects: this.state.projects.map((p) => (p.id === projectId ? { ...p, ...patch } : p)),
    }
    this.notify()
  }

  deleteProject(projectId: string): void {
    this.state = {
      projects: this.state.projects.filter((p) => p.id !== projectId),
      columns: this.state.columns.filter((c) => c.projectId !== projectId),
      cards: this.state.cards.filter((c) => c.projectId !== projectId),
    }
    this.notify()
  }

  // ---- columns ----
  createColumn(scope: Scope, name: string): string {
    const cid = this.genId()
    const col: Column = {
      id: cid,
      projectId: scope.projectId,
      parentCardId: scope.parentCardId,
      name,
      order: this.columnsForScope(scope).length,
    }
    this.state = { ...this.state, columns: [...this.state.columns, col] }
    this.notify()
    return cid
  }

  /** Seed a board (root or sub-board) with the default columns if it has none. Idempotent. */
  ensureBoardColumns(scope: Scope): void {
    if (this.columnsForScope(scope).length > 0) return
    const columns: Column[] = DEFAULT_COLUMNS.map((name, i) => ({
      id: this.genId(),
      projectId: scope.projectId,
      parentCardId: scope.parentCardId,
      name,
      order: i,
    }))
    this.state = { ...this.state, columns: [...this.state.columns, ...columns] }
    this.notify()
  }

  renameColumn(columnId: string, name: string): void {
    this.state = {
      ...this.state,
      columns: this.state.columns.map((c) => (c.id === columnId ? { ...c, name } : c)),
    }
    this.notify()
  }

  reorderColumns(orderedIds: string[]): void {
    const orderMap = new Map(orderedIds.map((id, i) => [id, i]))
    this.state = {
      ...this.state,
      columns: this.state.columns.map((c) =>
        orderMap.has(c.id) ? { ...c, order: orderMap.get(c.id)! } : c,
      ),
    }
    this.notify()
  }

  deleteColumn(columnId: string): void {
    const col = this.state.columns.find((c) => c.id === columnId)
    if (!col) return
    const columnIds = new Set<string>([columnId])
    const cardIds = new Set<string>()
    for (const card of this.state.cards.filter((c) => c.columnId === columnId)) {
      cardIds.add(card.id)
      const d = this.descendants(card.id)
      d.columnIds.forEach((id) => columnIds.add(id))
      d.cardIds.forEach((id) => cardIds.add(id))
    }
    const columns = this.repackColumns(
      this.state.columns.filter((c) => !columnIds.has(c.id)),
      col.parentCardId
        ? { projectId: col.projectId, parentCardId: col.parentCardId }
        : { projectId: col.projectId },
    )
    const cards = this.state.cards.filter((c) => !cardIds.has(c.id))
    this.state = { ...this.state, columns, cards }
    this.notify()
  }

  // ---- cards ----
  createCard(scope: Scope, columnId: string, input: CreateCardInput): string {
    const cid = this.genId()
    const card: Card = {
      id: cid,
      projectId: scope.projectId,
      parentCardId: scope.parentCardId,
      columnId,
      order: this.cardsInColumn(columnId).length,
      type: input.type ?? 'task',
      title: input.title,
      notes: input.notes,
      dueAt: input.dueAt,
      checklistItems: input.checklistItems,
      createdAt: this.now(),
    }
    this.state = { ...this.state, cards: [...this.state.cards, card] }
    this.notify()
    return cid
  }

  updateCard(
    cardId: string,
    patch: Partial<Pick<Card, 'title' | 'notes' | 'dueAt' | 'checklistItems' | 'type'>>,
  ): void {
    this.state = {
      ...this.state,
      cards: this.state.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)),
    }
    this.notify()
  }

  // ---- checklist items ----
  addChecklistItem(cardId: string, text: string): void {
    const card = this.getCard(cardId)
    if (!card || !text.trim()) return
    const items = [
      ...(card.checklistItems ?? []),
      { id: this.genId(), text: text.trim(), done: false },
    ]
    this.updateCard(cardId, { checklistItems: items })
  }

  toggleChecklistItem(cardId: string, itemId: string): void {
    const card = this.getCard(cardId)
    if (!card) return
    const items = (card.checklistItems ?? []).map((it) =>
      it.id === itemId ? { ...it, done: !it.done } : it,
    )
    this.updateCard(cardId, { checklistItems: items })
  }

  removeChecklistItem(cardId: string, itemId: string): void {
    const card = this.getCard(cardId)
    if (!card) return
    const items = (card.checklistItems ?? []).filter((it) => it.id !== itemId)
    this.updateCard(cardId, { checklistItems: items })
  }

  deleteCard(cardId: string): void {
    const card = this.state.cards.find((c) => c.id === cardId)
    if (!card) return
    const d = this.descendants(cardId)
    d.cardIds.add(cardId)
    const columns = this.state.columns.filter((c) => !d.columnIds.has(c.id))
    const cards = this.repackColumnCards(
      this.state.cards.filter((c) => !d.cardIds.has(c.id)),
      card.columnId,
    )
    this.state = { ...this.state, columns, cards }
    this.notify()
  }

  moveCard(cardId: string, toColumnId: string, toIndex: number): void {
    const card = this.state.cards.find((c) => c.id === cardId)
    if (!card) return
    const fromColumn = card.columnId
    const dest = this.cardsInColumn(toColumnId).filter((c) => c.id !== cardId)
    const index = Math.max(0, Math.min(toIndex, dest.length))
    const ordered = [...dest.slice(0, index), card, ...dest.slice(index)]

    const updates = new Map<string, { columnId: string; order: number }>()
    ordered.forEach((c, i) => updates.set(c.id, { columnId: toColumnId, order: i }))
    if (fromColumn !== toColumnId) {
      this.cardsInColumn(fromColumn)
        .filter((c) => c.id !== cardId)
        .forEach((c, i) => updates.set(c.id, { columnId: fromColumn, order: i }))
    }
    this.state = {
      ...this.state,
      cards: this.state.cards.map((c) => {
        const u = updates.get(c.id)
        return u ? { ...c, ...u } : c
      }),
    }
    this.notify()
  }

  // ---- internals ----
  /** All column + card ids nested beneath a (sub-board) card, recursively. */
  private descendants(cardId: string): { columnIds: Set<string>; cardIds: Set<string> } {
    const columnIds = new Set<string>()
    const cardIds = new Set<string>()
    const walk = (parentCardId: string) => {
      for (const col of this.state.columns.filter((c) => c.parentCardId === parentCardId)) {
        columnIds.add(col.id)
      }
      for (const c of this.state.cards.filter((c) => c.parentCardId === parentCardId)) {
        cardIds.add(c.id)
        walk(c.id)
      }
    }
    walk(cardId)
    return { columnIds, cardIds }
  }

  private repackColumns(columns: Column[], scope: Scope): Column[] {
    const inScope = columns
      .filter((c) =>
        scope.parentCardId
          ? c.parentCardId === scope.parentCardId
          : c.projectId === scope.projectId && !c.parentCardId,
      )
      .sort((a, b) => a.order - b.order)
    const orderMap = new Map(inScope.map((c, i) => [c.id, i]))
    return columns.map((c) => (orderMap.has(c.id) ? { ...c, order: orderMap.get(c.id)! } : c))
  }

  private repackColumnCards(cards: Card[], columnId: string): Card[] {
    const inCol = cards
      .filter((c) => c.columnId === columnId)
      .sort((a, b) => a.order - b.order)
    const orderMap = new Map(inCol.map((c, i) => [c.id, i]))
    return cards.map((c) => (orderMap.has(c.id) ? { ...c, order: orderMap.get(c.id)! } : c))
  }
}
