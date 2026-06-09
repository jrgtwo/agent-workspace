import { Emitter } from '../../core/emitter'

interface DocState { name: string; text: string }

export class DocEditorStore extends Emitter<DocState> {
  private state: DocState
  constructor(name: string, initial = '') { super(); this.state = { name, text: initial } }
  getState = (): DocState => this.state
  hydrate(state: DocState): void { this.state = state; this.notify() }
  setText(text: string): void { this.state = { ...this.state, text }; this.notify() }
  applyChange(payload: { find: string; replace: string }): boolean {
    if (!this.state.text.includes(payload.find)) return false
    // Replacer function avoids String.replace's `$`-pattern substitution ($&, $`, $', $$),
    // so a literal replacement like "costs $5" is inserted verbatim.
    this.setText(this.state.text.replace(payload.find, () => payload.replace))
    return true
  }

  /** Append a block of markdown to the end, separated by a blank line (verbatim into an empty doc). */
  appendText(text: string): void {
    const current = this.state.text
    this.setText(current.trim() ? `${current.trimEnd()}\n\n${text}` : text)
  }
}
