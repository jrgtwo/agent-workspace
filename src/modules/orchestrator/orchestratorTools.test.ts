import { describe, it, expect } from 'vitest'
import { createOrchestratorTools, type FeatureAgentRegistry } from './orchestratorTools'
import { OrchestratorPlanStore } from './planStore'
import { Registry } from '../../core/registry'
import { PermissionBroker } from '../../core/permissionBroker'
import { createStorage } from '../../core/storage/storage'
import { MemoryBackend } from '../../core/storage/memoryBackend'
import type { ToolDef } from '../../core/types'
import type { ChatResult } from '../../core/llamaClient'
import { ProposalStore } from '../../core/proposalStore'
import { PreviewStore } from './previewStore'

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
    const tools = createOrchestratorTools({ plan, featureAgents: new Map(), client: { chat: async () => ({ content: '', toolCalls: [] }) }, broker: new PermissionBroker(() => 'p'), surfaceId: 'orchestrator', proposals: new ProposalStore(() => 'c'), preview: new PreviewStore() })
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
    const tools = createOrchestratorTools({ plan, featureAgents, client, broker: new PermissionBroker(() => 'p'), surfaceId: 'orchestrator', proposals: new ProposalStore(() => 'c'), preview: new PreviewStore() })
    const delegate = tools.find((t) => t.name === 'delegate') as ToolDef
    const res = await delegate.handler({ targetFeature: 'widget', task: 'do it', stepId }) as { ok: boolean; result: string }
    expect(res.ok).toBe(true)
    expect(ran.value).toBe(true)
    expect(res.result).toContain('widget')
    expect(plan.getState().steps[0]).toMatchObject({ status: 'done' })
  })

  it('passes the feature\'s live context provider to the delegated subagent', async () => {
    const plan = makePlan(); await plan.init('A')
    const registry = new Registry()
    registry.register([{ name: 'do_work', description: 'w', parameters: { type: 'object', properties: {} }, handler: () => ({ ok: true }) }])
    const featureAgents: FeatureAgentRegistry = new Map([
      ['widget', { id: 'widget', title: 'Widget', description: 'd', registry, contextProvider: () => 'LIVE WIDGET STATE' }],
    ])
    const seen: { role: string; content: string }[][] = []
    const client = { chat: async (msgs: { role: string; content: string }[]) => { seen.push(msgs); return { content: 'done', toolCalls: [] } } }
    const tools = createOrchestratorTools({ plan, featureAgents, client, broker: new PermissionBroker(() => 'p'), surfaceId: 'orchestrator', proposals: new ProposalStore(() => 'c'), preview: new PreviewStore() })
    const delegate = tools.find((t) => t.name === 'delegate')!

    await delegate.handler({ targetFeature: 'widget', task: 'do it' })

    const sys = seen[0].find((m) => m.role === 'system')
    expect(sys?.content).toContain('LIVE WIDGET STATE')
  })

  it('delegate to an unknown feature returns a friendly error and does not throw', async () => {
    const plan = makePlan(); await plan.init('A')
    const tools = createOrchestratorTools({ plan, featureAgents: new Map(), client: { chat: async () => ({ content: '', toolCalls: [] }) }, broker: new PermissionBroker(() => 'p'), surfaceId: 'orchestrator', proposals: new ProposalStore(() => 'c'), preview: new PreviewStore() })
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
    const tools = createOrchestratorTools({ plan, featureAgents, client, broker: new PermissionBroker(() => 'p'), surfaceId: 'orchestrator', proposals: new ProposalStore(() => 'c'), preview: new PreviewStore() })
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
    const tools = createOrchestratorTools({ plan, featureAgents, client, broker: new PermissionBroker(() => 'p'), surfaceId: 'orchestrator', proposals: new ProposalStore(() => 'c'), preview: new PreviewStore() })
    const delegate = tools.find((t) => t.name === 'delegate')!
    const res = await delegate.handler({ targetFeature: 'widget', task: 'do it' }) as { ok: boolean }
    expect(res.ok).toBe(true)
    expect(ran.value).toBe(true)
    expect(plan.getState().steps[0].status).toBe('pending') // unrelated step untouched
  })

  it('delegate attaches newly-created proposal ids to the step and focuses the preview', async () => {
    const plan = makePlan(); await plan.init('A')
    plan.setPlan([{ title: 'work', targetFeature: 'widget', task: 'do it' }])
    const stepId = plan.getState().steps[0].id
    let pn = 0
    const proposals = new ProposalStore(() => `c-${++pn}`)
    const preview = new PreviewStore()
    const registry = new Registry()
    registry.register([{
      name: 'do_work', description: 'w', parameters: { type: 'object', properties: {} },
      handler: () => { proposals.propose({ moduleId: 'kanban-board', summary: 's', payload: {} }); return { ok: true } },
    }])
    const featureAgents: FeatureAgentRegistry = new Map([['widget', { id: 'widget', title: 'W', description: 'd', registry }]])
    const client = scriptedClient([
      { content: '', toolCalls: [{ id: 'c1', name: 'do_work', arguments: '{}' }] },
      { content: 'done', toolCalls: [] },
    ])
    const tools = createOrchestratorTools({ plan, featureAgents, client, broker: new PermissionBroker(() => 'p'), surfaceId: 'orchestrator', proposals, preview })
    const delegate = tools.find((t) => t.name === 'delegate')!
    await delegate.handler({ targetFeature: 'widget', task: 'do it', stepId })
    expect(preview.getState().focusedFeature).toBe('widget')
    expect(plan.getState().steps[0].changeIds).toHaveLength(1)
  })

  it('delegate flags when the subagent proposed NOTHING, so a false "done" is not relayed', async () => {
    const plan = makePlan(); await plan.init('A')
    const proposals = new ProposalStore(() => 'c')
    const preview = new PreviewStore()
    const registry = new Registry()
    registry.register([{ name: 'noop', description: 'n', parameters: { type: 'object', properties: {} }, handler: () => ({ ok: true }) }])
    const featureAgents: FeatureAgentRegistry = new Map([['kanban', { id: 'kanban', title: 'K', description: 'd', registry }]])
    const client = scriptedClient([
      { content: '', toolCalls: [{ id: 'c1', name: 'noop', arguments: '{}' }] },
      { content: 'I created the board.', toolCalls: [] },
    ])
    const tools = createOrchestratorTools({ plan, featureAgents, client, broker: new PermissionBroker(() => 'p'), surfaceId: 'orchestrator', proposals, preview })
    const delegate = tools.find((t) => t.name === 'delegate')!
    const res = await delegate.handler({ targetFeature: 'kanban', task: 'create a board' }) as { result: string; changesProposed: number }
    expect(res.changesProposed).toBe(0)
    expect(res.result).toContain('NO changes')
    expect(res.result).toContain('I created the board.') // the subagent's prose is preserved, but flagged
  })

  it('delegate does NOT add the "no changes" warning for an informational feature (e.g. search)', async () => {
    const plan = makePlan(); await plan.init('A')
    const proposals = new ProposalStore(() => 'c')
    const preview = new PreviewStore()
    const registry = new Registry()
    registry.register([{ name: 'web_search', description: 'w', parameters: { type: 'object', properties: {} }, handler: () => ({ ok: true }) }])
    const featureAgents: FeatureAgentRegistry = new Map([['search', { id: 'search', title: 'Search', description: 'd', registry, informational: true }]])
    const client = scriptedClient([
      { content: '', toolCalls: [{ id: 'c1', name: 'web_search', arguments: '{}' }] },
      { content: 'Here are the top 5 things to do in Lisbon.', toolCalls: [] },
    ])
    const tools = createOrchestratorTools({ plan, featureAgents, client, broker: new PermissionBroker(() => 'p'), surfaceId: 'orchestrator', proposals, preview })
    const res = await tools.find((t) => t.name === 'delegate')!.handler({ targetFeature: 'search', task: 'top 5 things to do in lisbon' }) as { result: string }
    expect(res.result).not.toMatch(/NO changes/i)
    expect(res.result).toContain('top 5 things to do in Lisbon')
  })

  it('delegate reports the concrete changes the subagent actually proposed', async () => {
    const plan = makePlan(); await plan.init('A')
    let pn = 0
    const proposals = new ProposalStore(() => `c-${++pn}`)
    const preview = new PreviewStore()
    const registry = new Registry()
    registry.register([{ name: 'mk', description: 'm', parameters: { type: 'object', properties: {} }, handler: () => { proposals.propose({ moduleId: 'kanban-project', summary: 'Create board "Launch"', payload: {} }); return { proposed: true } } }])
    const featureAgents: FeatureAgentRegistry = new Map([['kanban', { id: 'kanban', title: 'K', description: 'd', registry }]])
    const client = scriptedClient([
      { content: '', toolCalls: [{ id: 'c1', name: 'mk', arguments: '{}' }] },
      { content: 'done', toolCalls: [] },
    ])
    const tools = createOrchestratorTools({ plan, featureAgents, client, broker: new PermissionBroker(() => 'p'), surfaceId: 'orchestrator', proposals, preview })
    const delegate = tools.find((t) => t.name === 'delegate')!
    const res = await delegate.handler({ targetFeature: 'kanban', task: 'create a board' }) as { result: string; changesProposed: number }
    expect(res.changesProposed).toBe(1)
    expect(res.result).toContain('Create board "Launch"')
  })

  it('seeds the subagent with the feature\'s own prompt (so subagents are steered like the feature chat)', async () => {
    const plan = makePlan(); await plan.init('A')
    const registry = new Registry()
    registry.register([{ name: 'do_work', description: 'w', parameters: { type: 'object', properties: {} }, handler: () => ({ ok: true }) }])
    const featureAgents: FeatureAgentRegistry = new Map([
      ['widget', { id: 'widget', title: 'W', description: 'd', registry, prompt: 'WIDGET FEATURE GUIDANCE' }],
    ])
    const seen: { role: string; content: string }[][] = []
    const client = { chat: async (msgs: { role: string; content: string }[]) => { seen.push(msgs); return { content: 'done', toolCalls: [] } } }
    const tools = createOrchestratorTools({ plan, featureAgents, client, broker: new PermissionBroker(() => 'p'), surfaceId: 'orchestrator', proposals: new ProposalStore(() => 'c'), preview: new PreviewStore() })

    await tools.find((t) => t.name === 'delegate')!.handler({ targetFeature: 'widget', task: 'do it' })

    const sys = seen[0].find((m) => m.role === 'system')
    expect(sys?.content).toContain('WIDGET FEATURE GUIDANCE')   // the feature's own prompt
    expect(sys?.content).toMatch(/worker|summary/i)            // plus the delegation framing
  })
})
