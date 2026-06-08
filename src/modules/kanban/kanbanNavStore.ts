import { Emitter } from '../../core/emitter'
import type { Scope } from './types'

// Which board is on screen. A sub-board is just a board view whose scope has a parentCardId.
export type KanbanView =
  | { kind: 'projects' }
  | { kind: 'board'; scope: Scope }

interface NavState {
  view: KanbanView
}

/**
 * KanbanNavStore — the host owns navigation (the board is a native module, not a routed app).
 * Both the rendered UI and the agent tools read the active board from here.
 */
export class KanbanNavStore extends Emitter<NavState> {
  private state: NavState = { view: { kind: 'projects' } }

  getState = (): NavState => this.state

  openProjects(): void {
    this.state = { view: { kind: 'projects' } }
    this.notify()
  }

  openBoard(scope: Scope): void {
    this.state = { view: { kind: 'board', scope } }
    this.notify()
  }

  /** The currently-open board scope, or null on the projects view. */
  activeScope(): Scope | null {
    return this.state.view.kind === 'board' ? this.state.view.scope : null
  }
}
