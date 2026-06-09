import type { Storage, ScopedStore, StorageBackend } from './types'
import { MemoryBackend } from './memoryBackend'
import { IndexedDBBackend } from './indexedDbBackend'

export class StorageService implements Storage {
  private backend: StorageBackend

  constructor(backend: StorageBackend) {
    this.backend = backend
  }

  scope(namespace: string): ScopedStore {
    const backend = this.backend
    return {
      get: <T>(key: string) => backend.get(namespace, key) as Promise<T | undefined>,
      set: <T>(key: string, value: T) => backend.set(namespace, key, value),
      delete: (key: string) => backend.delete(namespace, key),
      keys: () => backend.keys(namespace),
    }
  }

  clear(): Promise<void> {
    return this.backend.clear()
  }
}

// Prefer real IndexedDB; fall back to in-memory if it is absent (e.g. tests, private mode).
export function createStorage(backend?: StorageBackend): StorageService {
  if (backend) return new StorageService(backend)
  try {
    if (typeof indexedDB !== 'undefined') {
      return new StorageService(new IndexedDBBackend('agent-workspace'))
    }
  } catch {
    // ignore and fall through to memory
  }
  return new StorageService(new MemoryBackend())
}
