import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createServices } from './services'
import { WorkspaceShell } from '../shell/WorkspaceShell'
import type { ChatResult } from '../core/llamaClient'

// Scripted model: 1) read the doc, 2) edit it, 3) remember a preference, 4) final answer.
function scriptedClient(scripts: ChatResult[]) {
  let i = 0
  return { chat: vi.fn(async (_m: any, _t: any, onToken: (s: string) => void): Promise<ChatResult> => {
    const r = scripts[i++] ?? { content: '', toolCalls: [] }
    if (r.content) onToken(r.content)
    return r
  }) }
}

// NOTE: this test drives the UI with `fireEvent` rather than `userEvent`. The chat input
// and permission buttons live inside react-resizable-panels containers, and userEvent's
// pointer-focus path does not deliver events through them under jsdom (verified: the
// controlled input stays empty). fireEvent dispatches the events directly and reliably.

describe('Notes slice — canonical scenario', () => {
  beforeEach(() => localStorage.clear())

  it('reads, edits (with permission), and remembers — all gated by the user', async () => {
    const client = scriptedClient([
      { content: '', toolCalls: [{ id: 'c1', name: 'read_document', arguments: '{}' }] },
      { content: '', toolCalls: [{ id: 'c2', name: 'apply_edit', arguments: JSON.stringify({ find: 'draft intro', replace: 'A crisp, direct intro.' }) }] },
      { content: '', toolCalls: [{ id: 'c3', name: 'remember', arguments: JSON.stringify({ fact: 'User prefers crisp, direct intros.' }) }] },
      { content: 'Done — I tightened your intro.', toolCalls: [] },
    ])
    const services = createServices({ client })
    services.docStore.setText('draft intro')

    render(<WorkspaceShell features={services.features} />)

    fireEvent.change(screen.getByPlaceholderText(/ask/i), { target: { value: 'tighten my intro' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    // 1) read permission prompt → allow. Wait for THIS request's text before clicking,
    //    so we don't click a stale Allow button from a prior (already-resolved) request.
    await screen.findByText('Read Untitled.md?')
    fireEvent.click(screen.getByRole('button', { name: /allow/i }))

    // 2) write permission prompt → allow (wait for the distinct edit request to appear)
    await screen.findByText(/Edit Untitled\.md/)
    fireEvent.click(screen.getByRole('button', { name: /allow/i }))

    // Let the agent loop fully settle (remember step + final answer) before asserting the DOM.
    await waitFor(() => expect(services.engine.getState().busy).toBe(false))

    // remember is not gated; final answer shows
    expect(await screen.findByText('Done — I tightened your intro.')).toBeInTheDocument()
    // document was edited
    expect(screen.getByLabelText('document')).toHaveValue('A crisp, direct intro.')
    // memory recorded the learning
    expect(screen.getByText('User prefers crisp, direct intros.')).toBeInTheDocument()
  })
})
