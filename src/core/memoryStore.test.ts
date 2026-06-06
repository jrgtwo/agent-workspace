import { describe, it, expect } from 'vitest'
import { MemoryStore } from './memoryStore'

let counter = 0
const genId = () => `m-${++counter}`

describe('MemoryStore', () => {
  it('adds and removes entries with stamped ids and timestamps', () => {
    counter = 0
    const store = new MemoryStore(genId, () => 100)
    store.add('fact a')
    store.add('fact b')
    expect(store.getState().entries).toEqual([
      { id: 'm-1', text: 'fact a', createdAt: 100 },
      { id: 'm-2', text: 'fact b', createdAt: 100 },
    ])
    store.remove('m-1')
    expect(store.getState().entries.map((e) => e.text)).toEqual(['fact b'])
  })

  it('hydrate() replaces entries and notifies', () => {
    counter = 0
    const store = new MemoryStore(genId, () => 100)
    let notified = 0
    store.subscribe(() => { notified++ })
    store.hydrate({ entries: [{ id: 'x', text: 'restored', createdAt: 1 }] })
    expect(store.getState().entries).toEqual([{ id: 'x', text: 'restored', createdAt: 1 }])
    expect(notified).toBe(1)
  })
})
