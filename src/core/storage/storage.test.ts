import { describe, it, expect } from 'vitest'
import { StorageService, createStorage } from './storage'
import { MemoryBackend } from './memoryBackend'

describe('StorageService', () => {
  it('scope() returns a store bound to its namespace', async () => {
    const svc = new StorageService(new MemoryBackend())
    const docs = svc.scope('doc-editor')
    const imgs = svc.scope('images')
    await docs.set('current', { text: 'hello' })
    expect(await docs.get<{ text: string }>('current')).toEqual({ text: 'hello' })
    // different namespace, same key: isolated
    expect(await imgs.get('current')).toBeUndefined()
    await docs.delete('current')
    expect(await docs.get('current')).toBeUndefined()
  })

  it('clear() erases data across every namespace', async () => {
    const svc = new StorageService(new MemoryBackend())
    await svc.scope('a').set('k', 1)
    await svc.scope('b').set('k', 2)
    await svc.clear()
    expect(await svc.scope('a').get('k')).toBeUndefined()
    expect(await svc.scope('b').get('k')).toBeUndefined()
  })
})

describe('createStorage', () => {
  it('uses the injected backend when provided', async () => {
    const backend = new MemoryBackend()
    const svc = createStorage(backend)
    await svc.scope('x').set('k', 1)
    expect(await backend.get('x', 'k')).toBe(1)
  })

  it('falls back to an in-memory backend when IndexedDB is unavailable', async () => {
    // jsdom has no indexedDB, so this exercises the fallback path without throwing.
    const svc = createStorage()
    await svc.scope('x').set('k', 'v')
    expect(await svc.scope('x').get('k')).toBe('v')
  })
})
