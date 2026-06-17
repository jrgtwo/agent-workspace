import { describe, it, expect, vi } from 'vitest'
import { toToolDefs } from './mcpAdapter'
import type { McpClient } from './mcpClient'

function fakeClient(call: ReturnType<typeof vi.fn>): McpClient {
  return { call } as unknown as McpClient
}

const tool = { name: 'read_file', description: 'Read a file', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }

describe('mcpAdapter', () => {
  it('maps an MCP tool to a broker-gated ToolDef preserving the input schema', () => {
    const [def] = toToolDefs([tool], { client: fakeClient(vi.fn()), connectorId: 'filesystem', locality: 'LOCAL' })
    expect(def.name).toBe('read_file')
    expect(def.parameters).toEqual(tool.inputSchema)
    expect(def.permission).toBeDefined()
    expect(def.permission!.locality).toBe('LOCAL')
    expect(def.permission!.resource).toContain('filesystem')
  })

  it('handler calls the client and returns the text on success', async () => {
    const call = vi.fn().mockResolvedValue({ ok: true, text: 'hello' })
    const [def] = toToolDefs([tool], { client: fakeClient(call), connectorId: 'filesystem' })
    const out = await def.handler({ path: 'notes.txt' })
    expect(call).toHaveBeenCalledWith('read_file', { path: 'notes.txt' })
    expect(out).toEqual({ ok: true, result: 'hello' })
  })

  it('handler returns an error object when the call fails', async () => {
    const call = vi.fn().mockResolvedValue({ ok: false, text: '', error: 'denied by server' })
    const [def] = toToolDefs([tool], { client: fakeClient(call), connectorId: 'filesystem' })
    const out = await def.handler({ path: 'x' }) as { ok: boolean; error: string }
    expect(out.ok).toBe(false)
    expect(out.error).toBe('denied by server')
  })
})
