import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createServices } from './services'
import { MemoryBackend } from '../core/storage/memoryBackend'
import { WorkspaceShell } from '../shell/WorkspaceShell'
import type { ChatResult } from '../core/llamaClient'

// Milkdown can't run meaningfully in jsdom — stub the composer so we can drive it with fireEvent.
vi.mock('../modules/aiChat/composer/ChatComposer', () => ({
  ChatComposer: ({ onSend, busy }: { onSend: (s: string) => void; onStop: () => void; busy: boolean }) => (
    <div>
      <input placeholder="Ask for writing help…" data-testid="chat-input" />
      <button onClick={() => {
        const el = document.querySelector<HTMLInputElement>('[data-testid="chat-input"]')
        if (el) onSend(el.value)
      }} disabled={busy}>Send</button>
    </div>
  ),
}))

// Scripted model: 1) read the doc, 2) propose an edit, 3) remember a preference, 4) final answer.
function scriptedClient(scripts: ChatResult[]) {
  let i = 0
  return { chat: vi.fn(async (_m: any, _t: any, onToken: (s: string) => void): Promise<ChatResult> => {
    const r = scripts[i++] ?? { content: '', toolCalls: [] }
    if (r.content) onToken(r.content)
    return r
  }) }
}

// NOTE: drive the UI with `fireEvent` (not `userEvent`): chat input and permission buttons live
// inside react-resizable-panels containers, and userEvent's pointer-focus path does not deliver
// events through them under jsdom. fireEvent dispatches directly and reliably.

describe('Notes slice — canonical scenario', () => {
  beforeEach(() => localStorage.clear())

  it('reads (gated), proposes an edit, remembers, then the user accepts the diff to apply it', async () => {
    const client = scriptedClient([
      { content: '', toolCalls: [{ id: 'c1', name: 'read_document', arguments: '{}' }] },
      { content: '', toolCalls: [{ id: 'c2', name: 'propose_edit', arguments: JSON.stringify({ find: 'draft intro', replace: 'A crisp, direct intro.', reason: 'tighter opening' }) }] },
      { content: '', toolCalls: [{ id: 'c3', name: 'remember', arguments: JSON.stringify({ fact: 'User prefers crisp, direct intros.' }) }] },
      { content: 'Done — I tightened your intro.', toolCalls: [] },
    ])
    const services = await createServices({ client, backend: new MemoryBackend() })
    services.docStore.setText('draft intro')

    render(<WorkspaceShell features={services.features} theme={services.theme} layoutStores={services.layoutStores} />)

    fireEvent.change(screen.getByPlaceholderText(/ask/i), { target: { value: 'tighten my intro' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    // 1) read permission prompt → allow. The request appears in both the inline AI Chat panel
    //    and the standalone Permissions panel; click the first Allow (resolving clears both).
    await screen.findAllByText('Read Untitled.md?')
    fireEvent.click(screen.getAllByRole('button', { name: /allow/i })[0])

    // 2) propose_edit is NOT gated — no "Edit Untitled.md?" prompt. The loop runs to completion.
    await waitFor(() => expect(services.engine.getState().busy).toBe(false))
    expect(await screen.findByText('Done — I tightened your intro.')).toBeInTheDocument()
    expect(screen.getByText('User prefers crisp, direct intros.')).toBeInTheDocument()

    // 3) The edit is pending as a diff, NOT yet applied: the editor is replaced by review mode.
    //    The review shows a word-level diff (added words highlighted), so check the added text
    //    is present rather than expecting the whole replacement as one contiguous node.
    expect(screen.queryByLabelText('document')).not.toBeInTheDocument()
    const review = await screen.findByLabelText('diff-review')
    expect(review.querySelector('.diff-add')).toBeTruthy()
    expect(review.textContent).toContain('crisp')

    // 4) Accepting the diff is the write authorization → text applied, editor returns.
    fireEvent.click(screen.getAllByRole('button', { name: /accept this change/i })[0])
    expect((await screen.findByLabelText('document')).textContent).toContain('A crisp, direct intro.')
  })
})
