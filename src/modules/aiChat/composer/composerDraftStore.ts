import { Emitter } from '../../../core/emitter'

export interface ComposerDraftState {
  /** Text to push into the composer. */
  text: string
  /** Bumps on every set so the same text re-applies (e.g. clicking the same example twice). */
  seq: number
}

/**
 * One-way channel for prefilling the chat composer from elsewhere (e.g. the Connectors panel's
 * example prompts). The composer watches `seq` and applies `text` on each change.
 */
export class ComposerDraftStore extends Emitter<ComposerDraftState> {
  private state: ComposerDraftState = { text: '', seq: 0 }

  getState = (): ComposerDraftState => this.state

  set(text: string): void {
    this.state = { text, seq: this.state.seq + 1 }
    this.notify()
  }
}
