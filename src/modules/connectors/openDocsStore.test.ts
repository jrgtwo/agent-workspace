import { describe, it, expect, vi } from 'vitest'
import { OpenDocsStore } from './openDocsStore'
import type { McpClient } from '../../core/mcp/mcpClient'

function fakeClient(files: Record<string, string>): McpClient {
  return {
    listTools: async () => [],
    call: async (name: string, args: unknown) => {
      if (name === 'read_file') return { ok: true, text: files[(args as { path: string }).path] ?? '' }
      return { ok: true, text: '' }
    },
  } as unknown as McpClient
}

describe('OpenDocsStore', () => {
  it('opens a file as a new active tab', async () => {
    const s = new OpenDocsStore(fakeClient({ '/a.md': '# A' }))
    await s.open('/a.md')
    expect(s.getState().tabs.map((t) => t.path)).toEqual(['/a.md'])
    expect(s.getState().activePath).toBe('/a.md')
    expect(s.activeDoc()?.doc.getState().text).toBe('# A')
  })

  it('focuses an already-open file instead of duplicating', async () => {
    const s = new OpenDocsStore(fakeClient({ '/a.md': 'A', '/b.md': 'B' }))
    await s.open('/a.md'); await s.open('/b.md'); await s.open('/a.md')
    expect(s.getState().tabs.length).toBe(2)
    expect(s.getState().activePath).toBe('/a.md')
  })

  it('closes a tab and activates a neighbor', async () => {
    const s = new OpenDocsStore(fakeClient({ '/a.md': 'A', '/b.md': 'B' }))
    await s.open('/a.md'); await s.open('/b.md')
    s.close('/b.md')
    expect(s.getState().tabs.map((t) => t.path)).toEqual(['/a.md'])
    expect(s.getState().activePath).toBe('/a.md')
  })

  it('reflects dirty state of the active doc in its tab', async () => {
    const s = new OpenDocsStore(fakeClient({ '/a.md': 'A' }))
    await s.open('/a.md')
    s.activeDoc()!.doc.setText('A changed')
    expect(s.getState().tabs.find((t) => t.path === '/a.md')?.dirty).toBe(true)
  })

  it('re-baselines shortly after open so editor normalization does not mark it dirty', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    try {
      const s = new OpenDocsStore(fakeClient({ '/a.md': '# A' }))
      await s.open('/a.md')
      s.activeDoc()!.doc.setText('# A\n') // simulate Milkdown re-serializing on mount
      expect(s.getState().tabs.find((t) => t.path === '/a.md')?.dirty).toBe(true)
      vi.advanceTimersByTime(60)
      expect(s.getState().tabs.find((t) => t.path === '/a.md')?.dirty).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})
