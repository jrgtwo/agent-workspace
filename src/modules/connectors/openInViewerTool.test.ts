import { describe, it, expect, vi } from 'vitest'
import type { McpClient } from '../../core/mcp/mcpClient'
import { OpenDocsStore } from './openDocsStore'
import { createOpenInViewerTool } from './openInViewerTool'

function fakeClient(result: { ok: boolean; text?: string; error?: string }) {
  return { call: vi.fn().mockResolvedValue({ ok: result.ok, text: result.text ?? '', error: result.error }) } as unknown as McpClient & { call: ReturnType<typeof vi.fn> }
}

describe('open_in_viewer tool', () => {
  it('opens the file into a tab and returns its contents', async () => {
    const client = fakeClient({ ok: true, text: '# README\nhello' })
    const open = new OpenDocsStore(client)
    const tool = createOpenInViewerTool({ open })

    const res = await tool.handler({ path: '/docs/sub/README.md' })

    expect(client.call).toHaveBeenCalledWith('read_file', { path: '/docs/sub/README.md' })
    expect(open.getState().tabs).toHaveLength(1)
    expect(open.getState().tabs[0]).toMatchObject({ path: '/docs/sub/README.md', name: 'README.md' })
    expect(res).toEqual({ ok: true, name: 'README.md', text: '# README\nhello' })
  })

  it('is permission-gated as a LOCAL read naming the path', () => {
    const client = fakeClient({ ok: true })
    const open = new OpenDocsStore(client)
    const tool = createOpenInViewerTool({ open })
    expect(tool.name).toBe('open_in_viewer')
    expect(tool.permission).toMatchObject({ kind: 'read', locality: 'LOCAL' })
    expect(tool.permission?.describe({ path: 'a.md' })).toMatch(/a\.md/)
  })

  it('returns an error when the read fails (no tab opened)', async () => {
    const client = fakeClient({ ok: false, error: 'no such file' })
    const open = new OpenDocsStore(client)
    const tool = createOpenInViewerTool({ open })

    const res = await tool.handler({ path: '/missing.md' })

    expect(res).toEqual({ ok: false, error: 'could not open file' })
    expect(open.getState().tabs).toHaveLength(0)
  })
})
