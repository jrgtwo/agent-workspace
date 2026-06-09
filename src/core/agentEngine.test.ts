import { describe, it, expect, vi } from 'vitest'
import { AgentEngine } from './agentEngine'
import { Registry } from './registry'
import { PermissionBroker } from './permissionBroker'
import type { ChatResult } from './llamaClient'
import type { ChatMessage, ToolDef } from './types'

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

it('respects a custom maxIters (stops after the given number of tool-call rounds)', async () => {
  let calls = 0
  const client = { chat: async (_m: unknown, _t: unknown, _on: (s: string) => void) => {
    calls++
    return { content: '', toolCalls: [{ id: `c${calls}`, name: 'noop', arguments: '{}' }] }
  } }
  const registry = new Registry()
  registry.register([{ name: 'noop', description: 'no-op', parameters: { type: 'object', properties: {} }, handler: () => ({ ok: true }) }])
  const engine = new AgentEngine(client, registry, new PermissionBroker(() => 'p'), 'test', 2)
  await engine.run('go')
  expect(calls).toBe(2) // capped at 2 rounds, not the default 5
})

describe('AgentEngine steering', () => {
  it('returns an instructive error naming the available tools when the model calls an unknown tool', async () => {
    const registry = new Registry()
    registry.register([{ name: 'delegate', description: 'd', parameters: { type: 'object', properties: {} }, handler: () => 'ok' }])
    const client = fakeClient([
      { content: '', toolCalls: [{ id: 'c1', name: 'create_card', arguments: '{}' }] },
      { content: 'sorry, delegating instead', toolCalls: [] },
    ])
    const engine = new AgentEngine(client, registry, new PermissionBroker(() => 'p'))

    await engine.run('go')

    const toolMsg = engine.getState().messages.find((m) => m.role === 'tool')
    expect(toolMsg?.content).toMatch(/unknown tool: create_card/i)
    // It must tell the model what it CAN call, so it can recover instead of guessing again.
    expect(toolMsg?.content).toContain('delegate')
  })

  it('stops looping when the model repeats the same tool call without making progress', async () => {
    let calls = 0
    const client = {
      chat: async () => {
        calls++
        return { content: 'let me try again', toolCalls: [{ id: `c${calls}`, name: 'noop', arguments: '{}' }] }
      },
    }
    const registry = new Registry()
    registry.register([{ name: 'noop', description: 'no-op', parameters: { type: 'object', properties: {} }, handler: () => ({ ok: true }) }])
    const engine = new AgentEngine(client as never, registry, new PermissionBroker(() => 'p'), 'test', 25)

    const answer = await engine.run('go')

    // Breaks well before the 25-iteration cap instead of spinning.
    expect(calls).toBeLessThan(5)
    expect(answer).toMatch(/repeat|same action|stopped/i)
    expect(engine.getState().busy).toBe(false)
  })

  it('appends live context-provider output to the system prompt sent to the model, without bloating history', async () => {
    const seen: ChatMessage[][] = []
    const client = {
      chat: async (msgs: ChatMessage[]) => { seen.push(msgs); return { content: 'ok', toolCalls: [] } },
    }
    const engine = new AgentEngine(client as never, new Registry(), new PermissionBroker(() => 'p'))
    engine.seedSystem('BASE PROMPT')
    engine.setContextProvider(() => 'LIVE STATE: open board = Movement')

    await engine.run('hi')

    const sentSystem = seen[0].find((m) => m.role === 'system')
    expect(sentSystem?.content).toContain('BASE PROMPT')
    expect(sentSystem?.content).toContain('LIVE STATE: open board = Movement')
    // The stored system message stays clean — the live state is injected per-run, not persisted.
    expect(engine.getState().messages.find((m) => m.role === 'system')?.content).toBe('BASE PROMPT')
  })
})

describe('AgentEngine stop', () => {
  it('aborts an in-flight run, clears busy, and resolves without throwing', async () => {
    const client = {
      chat: (_m: unknown, _t: unknown, _onTok: unknown, signal?: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            const err = new Error('aborted'); err.name = 'AbortError'; reject(err)
          })
        }),
    }
    const engine = new AgentEngine(client as never, new Registry(), new PermissionBroker(() => 'p'))
    const runPromise = engine.run('hello')
    await Promise.resolve()
    engine.stop()
    await expect(runPromise).resolves.toBe('')
    expect(engine.getState().busy).toBe(false)
    expect(engine.getState().streaming).toBe('')
  })
})
