// Low-level backend the Storage service is built on (namespace + key addressed).
export interface StorageBackend {
  get(ns: string, key: string): Promise<unknown>
  set(ns: string, key: string, value: unknown): Promise<void>
  delete(ns: string, key: string): Promise<void>
  keys(ns: string): Promise<string[]>
}

// Module-facing handle, already bound to a namespace.
export interface ScopedStore {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  keys(): Promise<string[]>
}

export interface Storage {
  scope(namespace: string): ScopedStore
}
