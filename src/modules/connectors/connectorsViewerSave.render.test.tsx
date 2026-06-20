import { describe, it, expect, vi } from 'vitest'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import type { McpClient } from '../../core/mcp/mcpClient'
import { OpenDocsStore } from './openDocsStore'
import { createConnectorsViewerModule } from './connectorsViewerModule'

const fakeClient = { call: async (_n: string, a: { path: string }) => ({ ok: true, text: '# ' + a.path }) } as unknown as McpClient

describe('connectors viewer Save control', () => {
  it('disables Save when there are no unsaved changes, enables it after an edit, and saves on click', async () => {
    const open = new OpenDocsStore(fakeClient)
    await open.open('/notes.md')
    render(createConnectorsViewerModule(open).render())

    await waitFor(() => expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument())
    const button = screen.getByRole('button', { name: /save/i })
    expect(button).toBeDisabled()

    const activeDoc = open.activeDoc()!
    const saveSpy = vi.spyOn(activeDoc.save, 'save').mockResolvedValue()

    act(() => { activeDoc.doc.setText('hello world') })
    expect(button).toBeEnabled()

    fireEvent.click(button)
    expect(saveSpy).toHaveBeenCalled()
  })
})
