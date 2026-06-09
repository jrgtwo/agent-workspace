import { describe, it, expect } from 'vitest'
import { OrchestratorSessionStore } from './sessionStore'
import { createStorage } from '../../core/storage/storage'
import { MemoryBackend } from '../../core/storage/memoryBackend'

function make() {
  let n = 0
  const store = new OrchestratorSessionStore(createStorage(new MemoryBackend()).scope('sessions'), () => `s-${++n}`, () => 1)
  return store
}

describe('OrchestratorSessionStore', () => {
  it('seeds one session on init', async () => {
    const s = make()
    await s.init()
    expect(s.getState().sessions).toHaveLength(1)
    expect(s.getState().activeId).toBe(s.getState().sessions[0].id)
  })

  it('creates, activates, renames, and switches sessions', async () => {
    const s = make()
    await s.init()
    await s.create('Work project')
    const work = s.getState().sessions.find((x) => x.title === 'Work project')!
    expect(s.getState().activeId).toBe(work.id)
    await s.rename(work.id, 'Website refresh')
    expect(s.getState().sessions.find((x) => x.id === work.id)!.title).toBe('Website refresh')
    const first = s.getState().sessions[0]
    await s.setActive(first.id)
    expect(s.getState().activeId).toBe(first.id)
  })

  it('deleting the active session activates another', async () => {
    const s = make()
    await s.init()
    await s.create('B')
    const active = s.getState().activeId
    await s.delete(active)
    expect(s.getState().sessions.find((x) => x.id === active)).toBeUndefined()
    expect(s.getState().activeId).not.toBe(active)
    expect(s.getState().sessions.length).toBeGreaterThan(0)
  })

  it('persists and restores across instances', async () => {
    const backend = new MemoryBackend()
    let n = 0
    const a = new OrchestratorSessionStore(createStorage(backend).scope('sessions'), () => `s-${++n}`, () => 1)
    await a.init()
    await a.create('Persisted')
    const b = new OrchestratorSessionStore(createStorage(backend).scope('sessions'), () => `s-${++n}`, () => 1)
    await b.init()
    expect(b.getState().sessions.some((x) => x.title === 'Persisted')).toBe(true)
  })
})
