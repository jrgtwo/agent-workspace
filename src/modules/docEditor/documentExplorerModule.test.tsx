import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createDocumentExplorerModule } from './documentExplorerModule'
import { DocumentLibraryStore } from './documentLibraryStore'
import { DocEditorStore } from './docEditorStore'
import { StorageService } from '../../core/storage/storage'
import { MemoryBackend } from '../../core/storage/memoryBackend'

let n = 0
const genId = () => `d-${++n}`

async function setup() {
  n = 0
  const scope = new StorageService(new MemoryBackend()).scope('doc-editor')
  const docStore = new DocEditorStore('Untitled.md', '')
  const lib = new DocumentLibraryStore(docStore, scope, genId, () => 1)
  await lib.init()
  const mod = createDocumentExplorerModule(lib)
  return { lib, mod }
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
