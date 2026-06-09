import { describe, it, expect } from 'vitest'
import { createOrchestratorTools, type FeatureAgentRegistry } from './orchestratorTools'
import { OrchestratorPlanStore } from './planStore'
import { Registry } from '../../core/registry'
import { PermissionBroker } from '../../core/permissionBroker'
import { createStorage } from '../../core/storage/storage'
import { MemoryBackend } from '../../core/storage/memoryBackend'
import type { ToolDef } from '../../core/types'
import type { ChatResult } from '../../core/llamaClient'

function makePlan() {
  let n = 0
  return new OrchestratorPlanStore(createStorage(new MemoryBackend()).scope('plan'), () => `st-${++n}`)
}

function fakeFeature(ran: { value: boolean }) {
  const registry = new Registry()
  registry.register([{
    name: 'do_work', description: 'does work', parameters: { type: 'object', properties: {} },
    handler: () => { ran.value = true; return { ok: true } },
  }])
  const featureAgents: FeatureAgentRegistry = new Map([
    ['widget', { id: 'widget', title: 'Widget', description: 'does widget work', registry }],
  ])
  return featureAgents
}

function scriptedClient(scripts: ChatResult[]) {
  let i = 0
  return { chat: async (_m: unknown, _t: unknown, _on: (s: string) => void): Promise<ChatResult> => scripts[i++] ?? { content: '', toolCalls: [] } }
}

describe('orchestrator tools', () => {
  it('update_plan replaces the active plan with pending steps', async () => {
    const plan = makePlan(); await plan.init('A')
    const tools = createOrchestratorTools({ plan, featureAgents: new Map(), client: { chat: async () => ({ content: '', toolCalls: [] }) }, broker: new PermissionBroker(() => 'p'), surfaceId: 'orchestrator' })
    const updatePlan = tools.find((t) => t.name === 'update_plan')!
    const res = updatePlan.handler({ steps: [{ title: 'Step 1', targetFeature: 'widget', task: 'do it' }] })
    expect(res).toMatchObject({ ok: true, count: 1 })
    expect(plan.getState().steps[0]).toMatchObject({ title: 'Step 1', status: 'pending' })
  })

  it('delegate runs a subagent on the target feature registry and marks the step done', async () => {
    const plan = makePlan(); await plan.init('A')
    plan.setPlan([{ title: 'work', targetFeature: 'widget', task: 'do it' }])
    const stepId = plan.getState().steps[0].id
    const ran = { value: false }
    const featureAgents = fakeFeature(ran)
    const client = scriptedClient([
      { content: '', toolCalls: [{ id: 'c1', name: 'do_work', arguments: '{}' }] },
      { content: 'Did the widget work.', toolCalls: [] },
    ])
    const tools = createOrchestratorTools({ plan, featureAgents, client, broker: new PermissionBroker(() => 'p'), surfaceId: 'orchestrator' })
    const delegate = tools.find((t) => t.name === 'delegate') as ToolDef
    const res = await delegate.handler({ targetFeature: 'widget', task: 'do it', stepId }) as { ok: boolean; result: string }
    expect(res.ok).toBe(true)
    expect(ran.value).toBe(true)
    expect(res.result).toContain('widget')
    expect(plan.getState().steps[0]).toMatchObject({ status: 'done' })
  })

  it('delegate to an unknown feature returns a friendly error and does not throw', async () => {
    const plan = makePlan(); await plan.init('A')
    const tools = createOrchestratorTools({ plan, featureAgents: new Map(), client: { chat: async () => ({ content: '', toolCalls: [] }) }, broker: new PermissionBroker(() => 'p'), surfaceId: 'orchestrator' })
    const delegate = tools.find((t) => t.name === 'delegate')!
    const res = await delegate.handler({ targetFeature: 'ghost', task: 'x' }) as { ok: boolean; error: string }
    expect(res.ok).toBe(false)
    expect(res.error).toContain('ghost')
  })

  it('delegate without stepId auto-links the first pending step matching the targetFeature', async () => {
    const plan = makePlan(); await plan.init('A')
    plan.setPlan([{ title: 'work', targetFeature: 'widget', task: 'do it' }])
    const ran = { value: false }
    const featureAgents = fakeFeature(ran)
    const client = scriptedClient([
      { content: '', toolCalls: [{ id: 'c1', name: 'do_work', arguments: '{}' }] },
      { content: 'Did the widget work.', toolCalls: [] },
    ])
    const tools = createOrchestratorTools({ plan, featureAgents, client, broker: new PermissionBroker(() => 'p'), surfaceId: 'orchestrator' })
    const delegate = tools.find((t) => t.name === 'delegate')!
    const res = await delegate.handler({ targetFeature: 'widget', task: 'do it' }) as { ok: boolean } // no stepId
    expect(res.ok).toBe(true)
    expect(ran.value).toBe(true)
    expect(plan.getState().steps[0].status).toBe('done')
  })

  it('delegate without stepId and no matching pending step still runs but leaves steps untouched', async () => {
    const plan = makePlan(); await plan.init('A')
    plan.setPlan([{ title: 'other', targetFeature: 'other-feature', task: 't' }])
    const ran = { value: false }
    const featureAgents = fakeFeature(ran)
    const client = scriptedClient([
      { content: '', toolCalls: [{ id: 'c1', name: 'do_work', arguments: '{}' }] },
      { content: 'done', toolCalls: [] },
    ])
    const tools = createOrchestratorTools({ plan, featureAgents, client, broker: new PermissionBroker(() => 'p'), surfaceId: 'orchestrator' })
    const delegate = tools.find((t) => t.name === 'delegate')!
    const res = await delegate.handler({ targetFeature: 'widget', task: 'do it' }) as { ok: boolean }
    expect(res.ok).toBe(true)
    expect(ran.value).toBe(true)
    expect(plan.getState().steps[0].status).toBe('pending') // unrelated step untouched
  })
})
