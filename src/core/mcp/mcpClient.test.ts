import { describe, it, expect, vi } from 'vitest'
import { McpClient } from './mcpClient'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

describe('McpClient', () => {
  it('lists tools from GET /tools', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ tools: [{ name: 'read_file', description: 'Read', inputSchema: { type: 'object' } }] }))
    const c = new McpClient('/mcp', fetchImpl as unknown as typeof fetch)
    const tools = await c.listTools()
    expect(fetchImpl).toHaveBeenCalledWith('/mcp/tools')
    expect(tools[0].name).toBe('read_file')
  })

  it('throws when the bridge returns non-ok on listTools', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false, 502))
    const c = new McpClient('/mcp', fetchImpl as unknown as typeof fetch)
    await expect(c.listTools()).rejects.toThrow()
  })

  it('calls a tool via POST /call and returns the result', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, text: 'file contents' }))
    const c = new McpClient('/mcp', fetchImpl as unknown as typeof fetch)
    const r = await c.call('read_file', { path: 'notes.txt' })
    expect(fetchImpl).toHaveBeenCalledWith('/mcp/call', expect.objectContaining({ method: 'POST' }))
    expect(r).toEqual({ ok: true, text: 'file contents', error: undefined })
  })

  it('preserves the connector tag from /tools', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ tools: [{ name: 'convert-contents', description: 'Convert', inputSchema: {}, connector: 'pandoc' }] }))
    const c = new McpClient('/mcp', fetchImpl as unknown as typeof fetch)
    const tools = await c.listTools()
    expect(tools[0].connector).toBe('pandoc')
  })
})
