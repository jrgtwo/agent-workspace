import { Emitter } from './emitter'
import type { MemoryEntry } from './types'

interface MemoryState { entries: MemoryEntry[] }

export class MemoryStore extends Emitter<MemoryState> {
  private state: MemoryState = { entries: [] }
  private genId: () => string
  private now: () => number

  constructor(genId: () => string, now: () => number = () => Date.now()) {
    super()
    this.genId = genId
    this.now = now
  }

  getState = (): MemoryState => this.state

  hydrate(state: MemoryState): void {
    this.state = state
    this.notify()
  }

  add(text: string): void {
    const entry: MemoryEntry = { id: this.genId(), text, createdAt: this.now() }
    this.state = { entries: [...this.state.entries, entry] }
    this.notify()
  }

  remove(id: string): void {
    this.state = { entries: this.state.entries.filter((e) => e.id !== id) }
    this.notify()
  }
}
