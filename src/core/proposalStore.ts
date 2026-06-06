import { Emitter } from './emitter'

export interface PendingChange {
  id: string
  moduleId: string          // which content module owns it, e.g. 'doc-editor'
  surfaceId?: string         // which chat proposed it (attribution; unset in this slice)
  summary: string            // human sentence, e.g. 'Replace "todays" with "today\'s"'
  payload: unknown           // domain-specific; doc text → { find: string; replace: string }
}

interface ProposalState { pending: PendingChange[] }

export class ProposalStore extends Emitter<ProposalState> {
  private state: ProposalState = { pending: [] }
  private genId: () => string

  constructor(genId: () => string) {
    super()
    this.genId = genId
  }

  getState = (): ProposalState => this.state

  /** Enqueue a pending change; returns its generated id. */
  propose(change: Omit<PendingChange, 'id'>): string {
    const id = this.genId()
    this.state = { pending: [...this.state.pending, { ...change, id }] }
    this.notify()
    return id
  }

  remove(id: string): void {
    this.state = { pending: this.state.pending.filter((c) => c.id !== id) }
    this.notify()
  }

  /** Pending changes owned by a given content module. */
  forModule(moduleId: string): PendingChange[] {
    return this.state.pending.filter((c) => c.moduleId === moduleId)
  }
}
