import { describe, it, expect, vi } from 'vitest'
import type { McpClient } from '../../core/mcp/mcpClient'
import { DocEditorStore } from '../docEditor/docEditorStore'
import { createOpenInViewerTool } from './openInViewerTool'

function fakeClient(result: { ok: boolean; text?: string; error?: string }) {
  return { call: vi.fn().mockResolvedValue({ ok: result.ok, text: result.text ?? '', error: result.error }) } as unknown as McpClient & { call: ReturnType<typeof vi.fn> }
}

describe('open_in_viewer tool', () => {
  it('reads the file via the bridge and hydrates the scratch store', async () => {
    const client = fakeClient({ ok: true, text: '# README\nhello' })
    const scratch = new DocEditorStore('No file open')
    const tool = createOpenInViewerTool({ client, scratch })

    const res = await tool.handler({ path: '/docs/sub/README.md' })

    expect(client.call).toHaveBeenCalledWith('read_file', { path: '/docs/sub/README.md' })
    // viewer now shows the file: basename as the title, contents as text, source path retained
    expect(scratch.getState()).toEqual({ name: 'README.md', text: '# README\nhello', sourcePath: '/docs/sub/README.md' })
    // contents are returned so the agent has them in-context too
    expect(res).toEqual({ ok: true, name: 'README.md', text: '# README\nhello' })
  })

  it('is permission-gated as a LOCAL read naming the path', () => {
    const tool = createOpenInViewerTool({ client: fakeClient({ ok: true }), scratch: new DocEditorStore('x') })
    expect(tool.name).toBe('open_in_viewer')
    expect(tool.permission).toMatchObject({ kind: 'read', locality: 'LOCAL' })
    expect(tool.permission?.describe({ path: 'a.md' })).toMatch(/a\.md/)
  })

  it('reports an error and leaves the viewer untouched when the read fails', async () => {
    const client = fakeClient({ ok: false, error: 'no such file' })
    const scratch = new DocEditorStore('No file open')
    const tool = createOpenInViewerTool({ client, scratch })

    const res = await tool.handler({ path: '/missing.md' })

    expect(res).toEqual({ ok: false, error: 'no such file' })
    expect(scratch.getState()).toEqual({ name: 'No file open', text: '' })
  })
})
