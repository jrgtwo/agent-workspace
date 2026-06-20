import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import type { McpClient } from '../../core/mcp/mcpClient'
import { OpenDocsStore } from './openDocsStore'
import { createConnectorsViewerModule } from './connectorsViewerModule'

const fakeClient = { call: async (_n: string, a: { path: string }) => ({ ok: true, text: '# ' + a.path }) } as unknown as McpClient

describe('connectors viewer Close control', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows "No file open" when no tabs are open', () => {
    const open = new OpenDocsStore(fakeClient)
    render(createConnectorsViewerModule(open).render())
    expect(screen.getByText(/no file open/i)).toBeInTheDocument()
  })

  it('closes a tab when clicking its close button (clean file, no confirm)', async () => {
    const open = new OpenDocsStore(fakeClient)
    await open.open('/a.md')
    await open.open('/b.md')
    render(createConnectorsViewerModule(open).render())

    await waitFor(() => expect(screen.getByRole('tab', { name: /a\.md/ })).toBeInTheDocument())
    const closeBtn = screen.getByLabelText('close a.md')
    const confirm = vi.spyOn(window, 'confirm')
    fireEvent.click(closeBtn)
    expect(confirm).not.toHaveBeenCalled()
    expect(open.getState().tabs.find((t) => t.path === '/a.md')).toBeUndefined()
  })

  it('confirms before discarding unsaved changes; cancel keeps the tab', async () => {
    const open = new OpenDocsStore(fakeClient)
    await open.open('/a.md')
    render(createConnectorsViewerModule(open).render())

    await waitFor(() => expect(screen.getByRole('tab', { name: /a\.md/ })).toBeInTheDocument())
    act(() => { open.activeDoc()!.doc.setText('edited') })
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    fireEvent.click(screen.getByLabelText('close a.md'))
    expect(open.getState().tabs.find((t) => t.path === '/a.md')).toBeDefined()
  })

  it('discards unsaved changes when confirm is accepted', async () => {
    const open = new OpenDocsStore(fakeClient)
    await open.open('/a.md')
    render(createConnectorsViewerModule(open).render())

    await waitFor(() => expect(screen.getByRole('tab', { name: /a\.md/ })).toBeInTheDocument())
    act(() => { open.activeDoc()!.doc.setText('edited') })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    fireEvent.click(screen.getByLabelText('close a.md'))
    expect(open.getState().tabs.find((t) => t.path === '/a.md')).toBeUndefined()
  })
})
