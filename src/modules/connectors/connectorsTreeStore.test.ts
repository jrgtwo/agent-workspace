import { describe, it, expect, vi } from 'vitest'
import type { McpClient } from '../../core/mcp/mcpClient'
import { ConnectorsTreeStore } from './connectorsTreeStore'

function clientFor(map: Record<string, { ok: boolean; text?: string; error?: string }>) {
  const call = vi.fn((name: string) => Promise.resolve({ ok: map[name]?.ok ?? false, text: map[name]?.text ?? '', error: map[name]?.error }))
  return { call } as unknown as McpClient & { call: ReturnType<typeof vi.fn> }
}

const TREE_JSON = JSON.stringify([
  { name: 'README.md', type: 'file' },
  { name: 'sub', type: 'directory', children: [{ name: 'a.txt', type: 'file' }] },
])

describe('ConnectorsTreeStore', () => {
  it('starts idle and empty', () => {
    expect(new ConnectorsTreeStore({ client: clientFor({}) }).getState()).toEqual({ status: 'idle', roots: [] })
  })

  it('load() discovers allowed roots then reads each tree', async () => {
    const client = clientFor({
      list_allowed_directories: { ok: true, text: '/home/me/sandbox' },
      directory_tree: { ok: true, text: TREE_JSON },
    })
    const store = new ConnectorsTreeStore({ client })

    await store.load()

    expect(client.call).toHaveBeenCalledWith('list_allowed_directories', {})
    expect(client.call).toHaveBeenCalledWith('directory_tree', { path: '/home/me/sandbox' })
    const s = store.getState()
    expect(s.status).toBe('ready')
    expect(s.roots).toEqual([
      {
        name: 'sandbox', path: '/home/me/sandbox', type: 'directory', children: [
          { name: 'README.md', path: '/home/me/sandbox/README.md', type: 'file' },
          { name: 'sub', path: '/home/me/sandbox/sub', type: 'directory', children: [
            { name: 'a.txt', path: '/home/me/sandbox/sub/a.txt', type: 'file' },
          ] },
        ],
      },
    ])
  })

  it('goes to error when the bridge cannot list directories', async () => {
    const store = new ConnectorsTreeStore({ client: clientFor({ list_allowed_directories: { ok: false, error: 'bridge down' } }) })
    await store.load()
    expect(store.getState()).toMatchObject({ status: 'error', error: 'bridge down', roots: [] })
  })

  it('load() can be called again to refresh', async () => {
    const client = clientFor({
      list_allowed_directories: { ok: true, text: '/r' },
      directory_tree: { ok: true, text: '[]' },
    })
    const store = new ConnectorsTreeStore({ client })
    await store.load()
    await store.load()
    expect(client.call).toHaveBeenCalledTimes(4) // 2 calls per load
    expect(store.getState().status).toBe('ready')
  })
})
