import type { StorageBackend } from './types'

// Single object store; entries keyed by `${ns}:${key}`. Stores structured values and Blobs.
export class IndexedDBBackend implements StorageBackend {
  private dbName: string
  private storeName = 'kv'
  private dbPromise: Promise<IDBDatabase> | undefined

  constructor(dbName: string) {
    this.dbName = dbName
  }

  private open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(this.dbName, 1)
        req.onupgradeneeded = () => req.result.createObjectStore(this.storeName)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    }
    return this.dbPromise
  }

  private compound(ns: string, key: string): string {
    return `${ns}:${key}`
  }

  private run<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest): Promise<T> {
    return this.open().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          const tx = db.transaction(this.storeName, mode)
          const req = op(tx.objectStore(this.storeName))
          req.onsuccess = () => resolve(req.result as T)
          req.onerror = () => reject(req.error)
        }),
    )
  }

  get(ns: string, key: string): Promise<unknown> {
    return this.run<unknown>('readonly', (s) => s.get(this.compound(ns, key)))
  }

  async set(ns: string, key: string, value: unknown): Promise<void> {
    await this.run('readwrite', (s) => s.put(value, this.compound(ns, key)))
  }

  async delete(ns: string, key: string): Promise<void> {
    await this.run('readwrite', (s) => s.delete(this.compound(ns, key)))
  }

  async keys(ns: string): Promise<string[]> {
    const all = await this.run<IDBValidKey[]>('readonly', (s) => s.getAllKeys())
    const prefix = `${ns}:`
    return all
      .map((k) => String(k))
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length))
  }

  // Single 'kv' store holds every namespace, so one clear() wipes all data.
  async clear(): Promise<void> {
    await this.run('readwrite', (s) => s.clear())
  }
}
