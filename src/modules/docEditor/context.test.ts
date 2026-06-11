import { describe, it, expect } from 'vitest'
import { DocEditorStore } from './docEditorStore'
import { describeNotesContext } from './context'
import { ProposalStore } from '../../core/proposalStore'
import type { DocumentLibraryStore } from './documentLibraryStore'

function fakeLibrary(docs: { id: string; name: string }[], activeId: string): DocumentLibraryStore {
  return {
    getState: () => ({ docs: docs.map((d) => ({ ...d, updatedAt: 0 })), activeId }),
  } as unknown as DocumentLibraryStore
}

const noProposals = () => new ProposalStore(() => 'c')

describe('describeNotesContext', () => {
  it('flags an empty active document and points at append_document', () => {
    const doc = new DocEditorStore('Meeting Notes.md', '')
    const library = fakeLibrary([{ id: 'a', name: 'Meeting Notes.md' }], 'a')

    const ctx = describeNotesContext(library, doc, noProposals())

    expect(ctx).toContain('Meeting Notes.md')
    expect(ctx).toMatch(/empty/i)
    expect(ctx).toContain('append_document')
  })

  it('reports a non-empty document without the empty hint', () => {
    const doc = new DocEditorStore('Notes.md', 'hello there friend')
    const library = fakeLibrary([{ id: 'a', name: 'Notes.md' }], 'a')

    const ctx = describeNotesContext(library, doc, noProposals())

    expect(ctx).not.toMatch(/empty/i)
    expect(ctx).toContain('Notes.md')
  })

  it('lists the other documents that exist', () => {
    const doc = new DocEditorStore('A.md', 'x')
    const library = fakeLibrary([
      { id: 'a', name: 'A.md' },
      { id: 'b', name: 'B.md' },
    ], 'a')

    const ctx = describeNotesContext(library, doc, noProposals())

    expect(ctx).toContain('B.md')
  })

  it('lists pending appends/new-docs the agent already proposed so it does not re-add them', () => {
    const doc = new DocEditorStore('A.md', 'x')
    const library = fakeLibrary([{ id: 'a', name: 'A.md' }], 'a')
    const proposals = noProposals()
    proposals.propose({ moduleId: 'doc-editor-append', summary: 's', payload: { text: 'hi', reason: 'r' } })
    proposals.propose({ moduleId: 'doc-library', summary: 's', payload: { name: 'Plan.md' } })

    const ctx = describeNotesContext(library, doc, proposals)

    expect(ctx).toMatch(/already proposed/i)
    expect(ctx).toMatch(/1 append/i)
    expect(ctx).toContain('Plan.md')
    expect(ctx).toMatch(/do NOT propose these again/i)
  })
})
