import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createDocEditorModule } from './docEditorModule'
import { DocEditorStore } from './docEditorStore'
import { ProposalStore } from '../../core/proposalStore'
import { ProposalApplier } from '../../core/proposalApplier'
import { DocumentLibraryStore } from './documentLibraryStore'
import { createStorage } from '../../core/storage/storage'
import { MemoryBackend } from '../../core/storage/memoryBackend'
import type { DocAppendPayload } from './diff/types'

function makeApplier(proposals: ProposalStore, store: DocEditorStore) {
  const applier = new ProposalApplier(proposals)
  applier.register('doc-editor', (c) => store.applyChange(c.payload as { find: string; replace: string }))
  applier.register('doc-editor-append', (c) => { store.appendText((c.payload as { text: string }).text); return true })
  return applier
}

// NOTE: do not call library.init() — it would hydrate docStore and wipe the 'Intro.' text.
// We only need a truthy library so the create_document tool is registered.
function build() {
  let n = 0
  const store = new DocEditorStore('Doc.md', 'Intro.')
  const proposals = new ProposalStore(() => `c-${++n}`)
  const library = new DocumentLibraryStore(store, createStorage(new MemoryBackend()).scope('doc-editor'), () => `d-${++n}`)
  const mod = createDocEditorModule(store, proposals, { library, applier: makeApplier(proposals, store) })
  const tool = (name: string) => mod.tools.find((t) => t.name === name)!
  return { store, proposals, tool }
}

describe('docEditor tools propose instead of mutating', () => {
  it('append_document enqueues a doc-editor-append proposal and does not change the doc until accepted', async () => {
    const { store, proposals, tool } = build()
    const res = await tool('append_document').handler({ text: 'New para.' })
    expect(res).toMatchObject({ proposed: true })
    expect(store.getState().text).toBe('Intro.') // unchanged
    const pending = proposals.forModule('doc-editor-append')
    expect(pending).toHaveLength(1)
    expect((pending[0].payload as DocAppendPayload).text).toBe('New para.')
  })

  it('append_document has no permission gate (the proposal is the gate)', () => {
    const { tool } = build()
    expect(tool('append_document').permission).toBeUndefined()
  })

  it('create_document enqueues a doc-library proposal carrying the name', async () => {
    const { proposals, tool } = build()
    const res = await tool('create_document').handler({ name: 'Plan.md' })
    expect(res).toMatchObject({ proposed: true })
    const pending = proposals.forModule('doc-library')
    expect(pending).toHaveLength(1)
    expect((pending[0].payload as { name?: string }).name).toBe('Plan.md')
  })
})

describe('docEditorModule', () => {
  it('exposes a read-gated read_document and an ungated propose_edit that enqueues without mutating', async () => {
    const store = new DocEditorStore('Untitled.md', 'INTRO')
    let n = 0
    const proposals = new ProposalStore(() => `c-${++n}`)
    const mod = createDocEditorModule(store, proposals, { applier: makeApplier(proposals, store) })
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

  it('rejects an ambiguous find (matches more than once) without enqueuing', async () => {
    const store = new DocEditorStore('Untitled.md', 'cat and cat')
    const proposals = new ProposalStore(() => 'c-1')
    const propose = createDocEditorModule(store, proposals, { applier: makeApplier(proposals, store) }).tools.find((t) => t.name === 'propose_edit')!
    const res = await propose.handler({ find: 'cat', replace: 'dog', reason: 'r' })
    expect((res as { proposed: boolean }).proposed).toBe(false)
    expect(proposals.forModule('doc-editor')).toHaveLength(0)
  })

  it('rejects a find with no match without enqueuing', async () => {
    const store = new DocEditorStore('Untitled.md', 'hello')
    const proposals = new ProposalStore(() => 'c-1')
    const propose = createDocEditorModule(store, proposals, { applier: makeApplier(proposals, store) }).tools.find((t) => t.name === 'propose_edit')!
    const res = await propose.handler({ find: 'absent', replace: 'x', reason: 'r' })
    expect((res as { proposed: boolean }).proposed).toBe(false)
    expect(proposals.forModule('doc-editor')).toHaveLength(0)
  })

  it('renders the document text in the markdown editor when there are no pending changes', async () => {
    const store = new DocEditorStore('Untitled.md', 'hello')
    const proposals = new ProposalStore(() => 'c-1')
    render(createDocEditorModule(store, proposals, { applier: makeApplier(proposals, store) }).render())
    expect((await screen.findByLabelText('document')).textContent).toContain('hello')
  })

  it('shows a diff review when a change is pending; Accept applies it and returns to the editor', async () => {
    const store = new DocEditorStore('Untitled.md', 'INTRO here')
    let n = 0
    const proposals = new ProposalStore(() => `c-${++n}`)
    render(createDocEditorModule(store, proposals, { applier: makeApplier(proposals, store) }).render())

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
    render(createDocEditorModule(store, proposals, { applier: makeApplier(proposals, store) }).render())

    proposals.propose({ moduleId: 'doc-editor', summary: 's', payload: { find: 'INTRO', replace: 'BETTER' } })
    expect(await screen.findByText('BETTER')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /reject this change/i }))
    expect(store.getState().text).toBe('INTRO here')
    expect((await screen.findByLabelText('document')).textContent).toContain('INTRO here')
  })

  it('create_document has no permission gate and enqueues a proposal without mutating', async () => {
    const store = new DocEditorStore('Untitled.md', '')
    const proposals = new ProposalStore(() => 'c-1')
    let n = 0
    const library = new DocumentLibraryStore(
      store,
      createStorage(new MemoryBackend()).scope('doc-editor'),
      () => `d-${++n}`,
    )
    const mod = createDocEditorModule(store, proposals, { library, applier: makeApplier(proposals, store) })
    const create = mod.tools.find((t) => t.name === 'create_document')!
    expect(create.permission).toBeUndefined()

    const before = library.getState().docs.length
    const res = await create.handler({ name: 'Plan.md' })
    expect(res).toMatchObject({ proposed: true })
    expect(library.getState().docs.length).toBe(before) // unchanged — not yet accepted
    expect(proposals.forModule('doc-library')).toHaveLength(1)
  })

  it('omits create_document when no library is provided', () => {
    const store = new DocEditorStore('Untitled.md', '')
    const proposals = new ProposalStore(() => 'c-1')
    const mod = createDocEditorModule(store, proposals, { applier: makeApplier(proposals, store) })
    expect(mod.tools.find((t) => t.name === 'create_document')).toBeUndefined()
  })

  it('append_document has no permission gate and enqueues a proposal without mutating', async () => {
    const store = new DocEditorStore('Untitled.md', '')
    const proposals = new ProposalStore(() => 'c-1')
    const append = createDocEditorModule(store, proposals, { applier: makeApplier(proposals, store) }).tools.find((t) => t.name === 'append_document')!
    expect(append.permission).toBeUndefined()
    const res = await append.handler({ text: '# Housework\n- mop' })
    expect(res).toMatchObject({ proposed: true })
    expect(store.getState().text).toBe('') // unchanged — not yet accepted
    expect(proposals.forModule('doc-editor-append')).toHaveLength(1)
  })

  it('surfaces an append proposal read-only (no buttons — approval is in the modal); applier applies it', () => {
    const store = new DocEditorStore('Doc.md', 'Intro.')
    let n = 0
    const proposals = new ProposalStore(() => `c-${++n}`)
    const applier = makeApplier(proposals, store)
    const mod = createDocEditorModule(store, proposals, { applier })
    const id = proposals.propose({ moduleId: 'doc-editor-append', summary: 'Append to Doc.md: "More."', payload: { text: 'More.', reason: 'r' } })
    render(mod.render())
    expect(screen.getByText('Append to Doc.md: "More."')).toBeTruthy()
    expect(screen.getByText(/awaiting approval/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /accept change/i })).toBeNull()
    // Approval is driven by the ChangeApprovalModal → applier; applying appends to the doc.
    applier.accept(proposals.getState().pending.find((c) => c.id === id)!)
    expect(store.getState().text).toBe('Intro.\n\nMore.')
  })
})
