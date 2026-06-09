import type { StorageBackend } from './types'

export class MemoryBackend implements StorageBackend {
  private data = new Map<string, unknown>()

  private compound(ns: string, key: string): string {
    return `${ns}:${key}`
  }

  async get(ns: string, key: string): Promise<unknown> {
    return this.data.get(this.compound(ns, key))
  }

  async set(ns: string, key: string, value: unknown): Promise<void> {
    this.data.set(this.compound(ns, key), value)
  }

  async delete(ns: string, key: string): Promise<void> {
    this.data.delete(this.compound(ns, key))
  }

  async keys(ns: string): Promise<string[]> {
    const prefix = `${ns}:`
    return [...this.data.keys()]
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length))
  }

  async clear(): Promise<void> {
    this.data.clear()
  }
}
