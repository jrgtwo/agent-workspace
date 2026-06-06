import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createDocEditorModule } from './docEditorModule'
import { DocEditorStore } from './docEditorStore'
import { ProposalStore } from '../../core/proposalStore'

describe('docEditorModule', () => {
  it('exposes a read-gated read_document and an ungated propose_edit that enqueues without mutating', async () => {
    const store = new DocEditorStore('Untitled.md', 'INTRO')
    let n = 0
    const proposals = new ProposalStore(() => `c-${++n}`)
    const mod = createDocEditorModule(store, proposals)
    const read = mod.tools.find((t) => t.name === 'read_document')!
    const propose = mod.tools.find((t) => t.name === 'propose_edit')!
    expect(read.permission?.kind).toBe('read')
    expect(propose.permission).toBeUndefined()
    expect(await read.handler({})).toBe('INTRO')

    await propose.handler({ find: 'INTRO', replace: 'BETTER INTRO' })
    expect(store.getState().text).toBe('INTRO') // unchanged — not applied
    const pending = proposals.forModule('doc-editor')
    expect(pending).toHaveLength(1)
    expect(pending[0].payload).toEqual({ find: 'INTRO', replace: 'BETTER INTRO' })
  })

  it('renders the document text in the markdown editor when there are no pending changes', async () => {
    const store = new DocEditorStore('Untitled.md', 'hello')
    const proposals = new ProposalStore(() => 'c-1')
    render(createDocEditorModule(store, proposals).render())
    expect((await screen.findByLabelText('document')).textContent).toContain('hello')
  })

  it('shows a diff review when a change is pending; Accept applies it and returns to the editor', async () => {
    const store = new DocEditorStore('Untitled.md', 'INTRO here')
    let n = 0
    const proposals = new ProposalStore(() => `c-${++n}`)
    render(createDocEditorModule(store, proposals).render())

    proposals.propose({ moduleId: 'doc-editor', summary: 's', payload: { find: 'INTRO', replace: 'BETTER' } })

    expect(await screen.findByText('BETTER')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /accept this change/i }))
    expect(store.getState().text).toBe('BETTER here')
    expect((await screen.findByLabelText('document')).textContent).toContain('BETTER here')
  })

  it('Reject discards the pending change without mutating the document', async () => {
    const store = new DocEditorStore('Untitled.md', 'INTRO here')
    let n = 0
    const proposals = new ProposalStore(() => `c-${++n}`)
    render(createDocEditorModule(store, proposals).render())

    proposals.propose({ moduleId: 'doc-editor', summary: 's', payload: { find: 'INTRO', replace: 'BETTER' } })
    expect(await screen.findByText('BETTER')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /reject this change/i }))
    expect(store.getState().text).toBe('INTRO here')
    expect((await screen.findByLabelText('document')).textContent).toContain('INTRO here')
  })
})
