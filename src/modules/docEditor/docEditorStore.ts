import { Emitter } from '../../core/emitter'

interface DocState { name: string; text: string }

export class DocEditorStore extends Emitter<DocState> {
  private state: DocState
  constructor(name: string, initial = '') { super(); this.state = { name, text: initial } }
  getState = (): DocState => this.state
  hydrate(state: DocState): void { this.state = state; this.notify() }
  setText(text: string): void { this.state = { ...this.state, text }; this.notify() }
  applyEdit(find: string, replace: string): boolean {
    if (!this.state.text.includes(find)) return false
    this.setText(this.state.text.replace(find, replace))
    return true
  }
}
