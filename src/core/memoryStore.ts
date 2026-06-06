import { Emitter } from './emitter'
import type { MemoryEntry } from './types'

interface MemoryState { entries: MemoryEntry[] }

export class MemoryStore extends Emitter<MemoryState> {
  private storageKey: string
  private genId: () => string
  private now: () => number
  private state: MemoryState

  constructor(
    storageKey: string,
    genId: () => string,
    now: () => number = () => Date.now(),
  ) {
    super()
    this.storageKey = storageKey
    this.genId = genId
    this.now = now
    this.state = { entries: this.load() }
  }

  getState = (): MemoryState => this.state

  add(text: string): void {
    const entry: MemoryEntry = { id: this.genId(), text, createdAt: this.now() }
    this.state = { entries: [...this.state.entries, entry] }
    this.persist()
    this.notify()
  }

  remove(id: string): void {
    this.state = { entries: this.state.entries.filter((e) => e.id !== id) }
    this.persist()
    this.notify()
  }

  private load(): MemoryEntry[] {
    try {
      const raw = localStorage.getItem(this.storageKey)
      return raw ? (JSON.parse(raw) as MemoryEntry[]) : []
    } catch { return [] }
  }

  private persist(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state.entries))
  }
}
