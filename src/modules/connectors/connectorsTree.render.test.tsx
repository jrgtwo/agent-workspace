import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { McpClient } from '../../core/mcp/mcpClient'
import { ConnectorsTreeStore } from './connectorsTreeStore'
import { createConnectorsTreeModule } from './connectorsTreeModule'

const TREE_JSON = JSON.stringify([
  { name: 'README.md', type: 'file' },
  { name: 'sub', type: 'directory', children: [{ name: 'a.txt', type: 'file' }] },
])

function readyStore() {
  const call = vi.fn((name: string) =>
    Promise.resolve(
      name === 'list_allowed_directories'
        ? { ok: true, text: '/sandbox' }
        : { ok: true, text: TREE_JSON },
    ),
  )
  const client = { call } as unknown as McpClient
  return new ConnectorsTreeStore({ client })
}

describe('connectors file tree', () => {
  it('shows roots and their top-level entries, hiding collapsed subfolders', async () => {
    const store = readyStore()
    await store.load()
    render(createConnectorsTreeModule(store, () => {}, () => {}).render())

    expect(screen.getByText('README.md')).toBeInTheDocument()
    expect(screen.getByText('sub')).toBeInTheDocument()
    expect(screen.queryByText('a.txt')).toBeNull() // sub is collapsed
  })

  it('expands a folder on click to reveal its children', async () => {
    const store = readyStore()
    await store.load()
    render(createConnectorsTreeModule(store, () => {}, () => {}).render())

    fireEvent.click(screen.getByText('sub'))
    expect(screen.getByText('a.txt')).toBeInTheDocument()
  })

  it('opens a file on click', async () => {
    const store = readyStore()
    await store.load()
    const onOpenFile = vi.fn()
    render(createConnectorsTreeModule(store, onOpenFile, () => {}).render())

    fireEvent.click(screen.getByText('README.md'))
    expect(onOpenFile).toHaveBeenCalledWith('/sandbox/README.md')
  })

  it('Refresh triggers the loader', async () => {
    const store = readyStore()
    await store.load()
    const onRefresh = vi.fn()
    render(createConnectorsTreeModule(store, () => {}, onRefresh).render())

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    expect(onRefresh).toHaveBeenCalled()
  })
})
