import { Emitter } from '../../core/emitter'
import { DEFAULT_STATUSES } from './types'
import type { Entity, GraphState, GraphProposalPayload } from './types'

export interface CreateEntityInput { type: string; title: string; status?: string; body?: string }

export class EntityStore extends Emitter<GraphState> {
  private state: GraphState = { entities: [] }
  private genId: () => string
  private now: () => number

  constructor(genId: () => string, now: () => number = () => Date.now()) {
    super()
    this.genId = genId
    this.now = now
  }

  getState = (): GraphState => this.state

  hydrate(state: GraphState): void {
    this.state = { entities: (state.entities ?? []).map((e) => ({ ...e, links: e.links ?? [] })) }
    this.notify()
  }

  // ---- selectors ----
  getEntity(id: string): Entity | undefined {
    return this.state.entities.find((e) => e.id === id)
  }

  /** Entities that link TO `id` (incoming edges). */
  backlinks(id: string): Entity[] {
    return this.state.entities.filter((e) => e.links.includes(id))
  }

  /** Distinct statuses present, ordered DEFAULT_STATUSES → alphabetical; '(none)' last if any unset. */
  statuses(): string[] {
    const present = new Set<string>()
    let hasNone = false
    for (const e of this.state.entities) {
      if (e.status) present.add(e.status)
      else hasNone = true
    }
    const def = DEFAULT_STATUSES as readonly string[]
    const ordered = [
      ...def.filter((s) => present.has(s)),
      ...[...present].filter((s) => !def.includes(s)).sort(),
    ]
    if (hasNone) ordered.push('(none)')
    return ordered
  }

  // ---- mutators ----
  create(input: CreateEntityInput): string {
    const id = this.genId()
    const t = this.now()
    const entity: Entity = {
      id,
      type: input.type.trim() || 'item',
      title: input.title.trim() || 'Untitled',
      status: input.status?.trim() || undefined,
      body: input.body,
      links: [],
      createdAt: t,
      updatedAt: t,
    }
    this.state = { entities: [...this.state.entities, entity] }
    this.notify()
    return id
  }

  update(id: string, patch: Partial<Pick<Entity, 'title' | 'status' | 'body' | 'type'>>): void {
    this.state = {
      entities: this.state.entities.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: this.now() } : e)),
    }
    this.notify()
  }

  setStatus(id: string, status: string): void {
    this.update(id, { status: status || undefined })
  }

  remove(id: string): void {
    this.state = {
      entities: this.state.entities
        .filter((e) => e.id !== id)
        .map((e) => (e.links.includes(id) ? { ...e, links: e.links.filter((l) => l !== id) } : e)),
    }
    this.notify()
  }

  link(from: string, to: string): void {
    if (from === to) return
    const exists = this.state.entities.some((e) => e.id === to)
    if (!exists) return
    this.state = {
      entities: this.state.entities.map((e) =>
        e.id === from && !e.links.includes(to) ? { ...e, links: [...e.links, to], updatedAt: this.now() } : e,
      ),
    }
    this.notify()
  }

  unlink(from: string, to: string): void {
    this.state = {
      entities: this.state.entities.map((e) =>
        e.id === from ? { ...e, links: e.links.filter((l) => l !== to), updatedAt: this.now() } : e,
      ),
    }
    this.notify()
  }

  /** Resolve a reference (id or exact title) to an entity id. */
  private resolve(ref: string): string | undefined {
    if (this.state.entities.some((e) => e.id === ref)) return ref
    return this.state.entities.find((e) => e.title === ref)?.id
  }

  /** Apply a pending graph proposal: creates first, then links (so links can target new entities by title), then updates. */
  applyProposal(payload: GraphProposalPayload): boolean {
    for (const c of payload.create ?? []) this.create(c)
    for (const l of payload.link ?? []) {
      const from = this.resolve(l.from)
      const to = this.resolve(l.to)
      if (from && to) this.link(from, to)
    }
    for (const u of payload.update ?? []) this.update(u.id, u.patch)
    return true
  }
}
