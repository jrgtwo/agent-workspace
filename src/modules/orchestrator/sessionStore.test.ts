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

  it('init drops sessions with duplicate ids (heals prior counter-collision corruption)', async () => {
    const scope = createStorage(new MemoryBackend()).scope('sessions')
    await scope.set('index', [
      { id: 's-1', title: 'First', createdAt: 1 },
      { id: 's-1', title: 'Collided', createdAt: 2 }, // duplicate id from the old resetting counter
      { id: 's-2', title: 'Second', createdAt: 3 },
    ])
    const s = new OrchestratorSessionStore(scope, () => 'x', () => 1)
    await s.init()
    expect(s.getState().sessions.map((x) => x.id)).toEqual(['s-1', 's-2'])
    expect(await scope.get('index')).toHaveLength(2)
  })
})
