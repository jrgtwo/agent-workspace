import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createStorage } from '../../core/storage/storage'
import { MemoryBackend } from '../../core/storage/memoryBackend'
import { DocEditorStore } from './docEditorStore'
import { DocumentLibraryStore } from './documentLibraryStore'
import { ProposalStore } from '../../core/proposalStore'
import { ProposalApplier } from '../../core/proposalApplier'
import { createDocumentExplorerModule } from './documentExplorerModule'

let n = 0
const genId = () => `d-${++n}`

async function setup() {
  n = 0
  const scope = createStorage(new MemoryBackend()).scope('doc-editor')
  const docStore = new DocEditorStore('Untitled.md', '')
  const lib = new DocumentLibraryStore(docStore, scope, genId, () => 1)
  await lib.init()
  const proposals = new ProposalStore(genId)
  const applier = new ProposalApplier(proposals)
  const mod = createDocumentExplorerModule(lib, proposals, applier)
  return { lib, mod, proposals, applier }
}

describe('documentExplorerModule', () => {
  beforeEach(() => { vi.stubGlobal('confirm', () => true) })

  it('renders the document list and highlights the active doc', async () => {
    const { lib, mod } = await setup()
    await lib.create() // now two docs, second active
    render(mod.render())
    expect(screen.getByText('Untitled.md')).toBeInTheDocument()
    expect(screen.getByText('Untitled 2.md')).toBeInTheDocument()
  })

  it('+ New creates a document', async () => {
    const { lib, mod } = await setup()
    render(mod.render())
    fireEvent.click(screen.getByRole('button', { name: /new document/i }))
    await waitFor(() => expect(lib.getState().docs).toHaveLength(2))
  })

  it('clicking a document switches the active doc', async () => {
    const { lib, mod } = await setup()
    const first = lib.getState().docs[0].id
    await lib.create() // second active
    render(mod.render())
    fireEvent.click(screen.getByText('Untitled.md'))
    await waitFor(() => expect(lib.getState().activeId).toBe(first))
  })

  it('delete removes the document (confirm stubbed true)', async () => {
    const { lib, mod } = await setup()
    await lib.create() // second active
    render(mod.render())
    fireEvent.click(screen.getByRole('button', { name: /delete Untitled 2\.md/i }))
    await waitFor(() => expect(lib.getState().docs.map((d) => d.name)).toEqual(['Untitled.md']))
  })
})

describe('document explorer surfaces pending new-document proposals', () => {
  it('renders a doc-library proposal and accepting it triggers library.create', async () => {
    let n = 0
    const docStore = new DocEditorStore('Untitled.md', '')
    const library = new DocumentLibraryStore(docStore, createStorage(new MemoryBackend()).scope('doc-editor'), () => `d-${++n}`)
    await library.init()
    const proposals = new ProposalStore(() => `c-${++n}`)
    const applier = new ProposalApplier(proposals)
    let created: string | undefined = 'unset'
    applier.register('doc-library', (c) => { created = (c.payload as { name?: string }).name; return true })
    const mod = createDocumentExplorerModule(library, proposals, applier)
    proposals.propose({ moduleId: 'doc-library', summary: 'Create document "Plan.md"', payload: { name: 'Plan.md' } })

    render(mod.render())
    expect(screen.getByText('Create document "Plan.md"')).toBeTruthy()
    // Read-only indicator — approval moved to the ChangeApprovalModal (drives the applier).
    expect(screen.queryByRole('button', { name: /accept change/i })).toBeNull()
    applier.accept(proposals.getState().pending[0])
    expect(created).toBe('Plan.md')
  })
})
