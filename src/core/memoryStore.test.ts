import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStore } from './memoryStore'

let counter = 0
const genId = () => `m-${++counter}`

describe('MemoryStore', () => {
  beforeEach(() => { localStorage.clear(); counter = 0 })

  it('adds, lists, and persists entries to localStorage', () => {
    const store = new MemoryStore('test-memory', genId, () => 100)
    store.add('User prefers concise intros')
    expect(store.getState().entries).toHaveLength(1)
    expect(store.getState().entries[0]).toMatchObject({ id: 'm-1', text: 'User prefers concise intros', createdAt: 100 })
    const reloaded = new MemoryStore('test-memory', genId, () => 200)
    expect(reloaded.getState().entries).toHaveLength(1)
  })

  it('removes entries', () => {
    const store = new MemoryStore('test-memory', genId, () => 100)
    store.add('fact a')
    store.add('fact b')
    store.remove('m-1')
    expect(store.getState().entries.map((e) => e.text)).toEqual(['fact b'])
  })
})
