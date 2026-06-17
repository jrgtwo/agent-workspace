import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { McpStore } from '../../core/mcp/mcpStore'
import { createConnectorsModule } from './connectorsModule'

describe('connectors panel', () => {
  it('lists tools when ready', () => {
    const store = new McpStore()
    store.setReady([{ name: 'read_file', description: 'Read a file' }, { name: 'list_directory', description: 'List a dir' }])
    render(createConnectorsModule(store, () => {}).render())
    expect(screen.getByText('read_file')).toBeInTheDocument()
    expect(screen.getByText('list_directory')).toBeInTheDocument()
  })

  it('shows an offline message on error', () => {
    const store = new McpStore()
    store.setError('connection refused')
    render(createConnectorsModule(store, () => {}).render())
    expect(screen.getByLabelText('connectors')).toHaveTextContent(/bridge/i)
  })

  it('Refresh triggers the callback', () => {
    const store = new McpStore()
    const onRefresh = vi.fn()
    render(createConnectorsModule(store, onRefresh).render())
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(onRefresh).toHaveBeenCalled()
  })
})
