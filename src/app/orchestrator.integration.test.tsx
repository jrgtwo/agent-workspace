import { describe, it, expect, vi } from 'vitest'
import { createServices } from './services'
import { MemoryBackend } from '../core/storage/memoryBackend'
import type { ChatResult } from '../core/llamaClient'

// Shared scripted model consumed (in order) by the orchestrator engine AND the spawned subagent:
//  1) orchestrator: set the plan
//  2) orchestrator: delegate to kanban
//  3)   subagent: create a board
//  4)   subagent: open the board
//  5)   subagent: add a card
//  6)   subagent: final summary
//  7) orchestrator: final reply
function scripted(): { chat: (m: unknown, t: unknown, on: (s: string) => void) => Promise<ChatResult> } {
  const seq: ChatResult[] = [
    { content: '', toolCalls: [{ id: 'o1', name: 'update_plan', arguments: JSON.stringify({ steps: [{ title: 'Build board', targetFeature: 'kanban', task: 'Create a board "Launch" with a card "Ship it" in Backlog' }] }) }] },
    { content: '', toolCalls: [{ id: 'o2', name: 'delegate', arguments: JSON.stringify({ targetFeature: 'kanban', task: 'Create a board "Launch", open it, add a card "Ship it" to Backlog' }) }] },
    { content: '', toolCalls: [{ id: 's1', name: 'create_board', arguments: JSON.stringify({ name: 'Launch' }) }] },
    { content: '', toolCalls: [{ id: 's2', name: 'open_board', arguments: JSON.stringify({ name: 'Launch' }) }] },
    { content: '', toolCalls: [{ id: 's3', name: 'create_card', arguments: JSON.stringify({ columnName: 'Backlog', title: 'Ship it' }) }] },
    { content: 'Created the Launch board with a Ship it card.', toolCalls: [] },
    { content: 'Done — your Launch board is ready.', toolCalls: [] },
  ]
  let i = 0
  return { chat: async (_m, _t, on) => { const r = seq[i++] ?? { content: '', toolCalls: [] }; if (r.content) on(r.content); return r } }
}

describe('orchestrator end-to-end (scripted)', () => {
  it('plans, delegates to a kanban subagent, and the board gets built', async () => {
    const backend = new MemoryBackend()
    const services = await createServices({ client: scripted(), backend })

    // Auto-allow any permission prompt the subagent raises (create_board/create_card are writes).
    services.broker.subscribe(() => {
      for (const r of services.broker.getState().pending) services.broker.allow(r.id)
    })

    await services.orchestratorEngine.run('Set up a launch board')

    const steps = services.planStore.getState().steps
    expect(steps).toHaveLength(1)
    expect(steps[0].status).toBe('done')

    const project = services.kanban.getState().projects.find((p) => p.name === 'Launch')
    expect(project).toBeDefined()
    const titles = services.kanban.getState().cards.map((c) => c.title)
    expect(titles).toContain('Ship it')
  })

  it('exposes the orchestrator feature with delegation-only tools on the chat module', async () => {
    const services = await createServices({ client: { chat: vi.fn() }, backend: new MemoryBackend() })
    const f = services.features.find((f) => f.id === 'orchestrator')
    expect(f).toBeDefined()
    const chatModule = f!.modules.find((m) => m.id === 'ai-chat')!
    expect(chatModule.tools).toEqual([]) // orchestrator tools live in the registry, not the chat module
  })
})
