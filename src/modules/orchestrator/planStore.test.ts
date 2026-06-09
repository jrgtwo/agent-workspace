import { describe, it, expect } from 'vitest'
import { OrchestratorPlanStore } from './planStore'
import { createStorage } from '../../core/storage/storage'
import { MemoryBackend } from '../../core/storage/memoryBackend'
import type { PlanStep } from './types'

function make(backend = new MemoryBackend()) {
  let n = 0
  return { store: new OrchestratorPlanStore(createStorage(backend).scope('plan'), () => `st-${++n}`), backend }
}

describe('OrchestratorPlanStore', () => {
  it('setPlan assigns ids + pending status; updateStep mutates one step', async () => {
    const { store } = make()
    await store.init('A')
    store.setPlan([{ title: 'Notes', targetFeature: 'notes', task: 'write' }])
    const step = store.getState().steps[0]
    expect(step.id).toBeTruthy()
    expect(step.status).toBe('pending')
    store.updateStep(step.id, { status: 'done', result: 'ok' })
    expect(store.getState().steps[0]).toMatchObject({ status: 'done', result: 'ok' })
  })

  it('switchTo flush-saves the outgoing plan and loads the incoming', async () => {
    const { store } = make()
    await store.init('A')
    store.setPlan([{ title: 'A-step', targetFeature: 'notes', task: 't' }])
    await store.switchTo('B')
    expect(store.getState().steps).toEqual([])
    await store.switchTo('A')
    expect(store.getState().steps.map((s: PlanStep) => s.title)).toEqual(['A-step'])
  })

  it('pruneExcept deletes plans for sessions no longer present', async () => {
    const { store, backend } = make()
    await store.init('A')
    store.setPlan([{ title: 'A', targetFeature: '', task: '' }])
    await store.switchTo('B')
    store.setPlan([{ title: 'B', targetFeature: '', task: '' }])
    await store.switchTo('A')
    await store.pruneExcept(['A'])
    expect(await backend.get('plan', 'B')).toBeUndefined()
    expect(await backend.get('plan', 'A')).toBeTruthy()
  })

  it('persists the active plan across instances', async () => {
    const backend = new MemoryBackend()
    const a = make(backend)
    await a.store.init('A')
    a.store.setPlan([{ title: 'persisted', targetFeature: 'notes', task: 't' }])
    await a.store.flush()
    const b = make(backend)
    await b.store.init('A')
    expect(b.store.getState().steps.map((s: PlanStep) => s.title)).toEqual(['persisted'])
  })

  it('setPlan initializes changeIds to [] and updateStep can set them', async () => {
    let n = 0
    const store = new OrchestratorPlanStore(createStorage(new MemoryBackend()).scope('plan'), () => `st-${++n}`)
    await store.init('A')
    store.setPlan([{ title: 'work', targetFeature: 'kanban', task: 't' }])
    const id = store.getState().steps[0].id
    expect(store.getState().steps[0].changeIds).toEqual([])
    store.updateStep(id, { changeIds: ['c-1', 'c-2'] })
    expect(store.getState().steps[0].changeIds).toEqual(['c-1', 'c-2'])
  })
})
