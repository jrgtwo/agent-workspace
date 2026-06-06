import { describe, it, expect, vi } from 'vitest'
import { AgentEngine } from './agentEngine'
import { Registry } from './registry'
import { PermissionBroker } from './permissionBroker'
import type { ChatResult } from './llamaClient'
import type { ToolDef } from './types'

// A fake LlamaClient that returns scripted results per call.
function fakeClient(scripts: ChatResult[]) {
  let i = 0
  return {
    chat: vi.fn(async (_m: any, _t: any, onToken: (s: string) => void): Promise<ChatResult> => {
      const r = scripts[i++]
      if (r.content) onToken(r.content)
      return r
    }),
  } as any
}

const readTool: ToolDef = {
  name: 'read_document', description: 'read the doc',
  parameters: { type: 'object', properties: {} },
  permission: { kind: 'read', resource: 'document:Untitled.md', locality: 'LOCAL', describe: () => 'Read Untitled.md?' },
  handler: () => 'INTRO PARAGRAPH',
}

describe('AgentEngine', () => {
  it('runs a tool call only after permission is granted, then returns the final answer', async () => {
    const registry = new Registry(); registry.register([readTool])
    let n = 0
    const broker = new PermissionBroker(() => `p-${++n}`)
    const client = fakeClient([
      { content: '', toolCalls: [{ id: 'c1', name: 'read_document', arguments: '{}' }] },
      { content: 'Here is a tighter intro.', toolCalls: [] },
    ])
    const engine = new AgentEngine(client, registry, broker)

    const runPromise = engine.run('tighten my intro')
    // Permission prompt should appear; grant it.
    await vi.waitFor(() => expect(broker.getState().pending).toHaveLength(1))
    broker.allow(broker.getState().pending[0].id)

    const answer = await runPromise
    expect(answer).toBe('Here is a tighter intro.')
    // tool result must have been fed back as a 'tool' message
    const toolMsg = engine.getState().messages.find((m) => m.role === 'tool')
    expect(toolMsg?.content).toContain('INTRO PARAGRAPH')
    expect(engine.getState().busy).toBe(false)
  })

  it('feeds back a denial and does not execute the handler when permission is denied', async () => {
    const handler = vi.fn(() => 'SECRET')
    const registry = new Registry()
    registry.register([{ ...readTool, handler }])
    let n = 0
    const broker = new PermissionBroker(() => `p-${++n}`)
    const client = fakeClient([
      { content: '', toolCalls: [{ id: 'c1', name: 'read_document', arguments: '{}' }] },
      { content: 'Okay, I will not read it.', toolCalls: [] },
    ])
    const engine = new AgentEngine(client, registry, broker)

    const runPromise = engine.run('tighten my intro')
    await vi.waitFor(() => expect(broker.getState().pending).toHaveLength(1))
    broker.deny(broker.getState().pending[0].id)

    await runPromise
    expect(handler).not.toHaveBeenCalled()
    const toolMsg = engine.getState().messages.find((m) => m.role === 'tool')
    expect(toolMsg?.content).toMatch(/denied/i)
  })

  it('resets busy to false even when the model call throws (so the UI never wedges)', async () => {
    const registry = new Registry()
    const broker = new PermissionBroker(() => 'p')
    const client = { chat: vi.fn(async () => { throw new Error('boom') }) } as any
    const engine = new AgentEngine(client, registry, broker)

    await expect(engine.run('hi')).rejects.toThrow('boom')
    expect(engine.getState().busy).toBe(false)
  })

  it('hydrateMessages restores prior messages; seedSystem keeps exactly one system message', () => {
    const engine = new AgentEngine({ chat: vi.fn() } as any, new Registry(), new PermissionBroker(() => 'p'))
    engine.hydrateMessages([
      { role: 'system', content: 'OLD SYSTEM' },
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ])
    engine.seedSystem('NEW SYSTEM')
    const msgs = engine.getState().messages
    expect(msgs.filter((m) => m.role === 'system')).toEqual([{ role: 'system', content: 'NEW SYSTEM' }])
    expect(msgs.map((m) => m.role)).toEqual(['system', 'user', 'assistant'])
  })

  it('stamps its surfaceId onto every permission request it makes', async () => {
    const registry = new Registry(); registry.register([readTool])
    const captured: (string | undefined)[] = []
    const broker = {
      request: vi.fn(async (_s: any, _a: any, surfaceId?: string) => { captured.push(surfaceId); return true }),
    } as any
    const client = fakeClient([
      { content: '', toolCalls: [{ id: 'c1', name: 'read_document', arguments: '{}' }] },
      { content: 'done', toolCalls: [] },
    ])
    const engine = new AgentEngine(client, registry, broker, 'ai-chat')

    await engine.run('go')

    expect(captured).toEqual(['ai-chat'])
  })
})
