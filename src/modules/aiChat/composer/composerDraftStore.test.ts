import { describe, it, expect, vi } from 'vitest'
import { ComposerDraftStore } from './composerDraftStore'

describe('ComposerDraftStore', () => {
  it('starts empty at seq 0', () => {
    expect(new ComposerDraftStore().getState()).toEqual({ text: '', seq: 0 })
  })

  it('set stores text and bumps seq each time, notifying subscribers', () => {
    const store = new ComposerDraftStore()
    const listener = vi.fn()
    store.subscribe(listener)

    store.set('hello')
    expect(store.getState()).toEqual({ text: 'hello', seq: 1 })

    // Same text again still bumps seq so the composer re-applies it.
    store.set('hello')
    expect(store.getState()).toEqual({ text: 'hello', seq: 2 })

    expect(listener).toHaveBeenCalledTimes(2)
  })
})
