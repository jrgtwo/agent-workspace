import { describe, it, expect, vi } from 'vitest'
import { persistState } from './persistState'
import { StorageService } from './storage'
import { MemoryBackend } from './memoryBackend'
import { Emitter } from '../emitter'

interface CountState { n: number }
class CountStore extends Emitter<CountState> {
  private state: CountState = { n: 0 }
  getState = (): CountState => this.state
  hydrate(s: CountState): void { this.state = s; this.notify() }
  inc(): void { this.state = { n: this.state.n + 1 }; this.notify() }
}

describe('persistState', () => {
  it('hydrates the store from previously saved state on init', async () => {
    const backend = new MemoryBackend()
    await backend.set('counter', 'state', { n: 7 })
    const svc = new StorageService(backend)
    const store = new CountStore()

    await persistState(store, svc.scope('counter'), 'state', 0)
    expect(store.getState()).toEqual({ n: 7 })
  })

  it('auto-saves the store state to the backend when it changes', async () => {
    const backend = new MemoryBackend()
    const svc = new StorageService(backend)
    const store = new CountStore()

    await persistState(store, svc.scope('counter'), 'state', 0) // debounce 0ms
    store.inc()
    await vi.waitFor(async () => {
      expect(await backend.get('counter', 'state')).toEqual({ n: 1 })
    })
  })

  it('does not save during the initial hydrate (no redundant write before a change)', async () => {
    const backend = new MemoryBackend()
    await backend.set('counter', 'state', { n: 5 })
    const setSpy = vi.spyOn(backend, 'set')
    const svc = new StorageService(backend)
    const store = new CountStore()

    await persistState(store, svc.scope('counter'), 'state', 0)
    // allow any stray debounced callback to flush
    await new Promise((r) => setTimeout(r, 5))
    expect(setSpy).not.toHaveBeenCalled()
  })
})
