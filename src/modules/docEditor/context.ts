import type { DocEditorStore } from './docEditorStore'
import type { DocumentLibraryStore } from './documentLibraryStore'
import type { ProposalStore } from '../../core/proposalStore'

/**
 * A one-shot, plain-text snapshot of the notes workspace the agent is working in, injected into
 * the system prompt each run: which document is active, whether it's empty (so the model reaches
 * for append_document instead of propose_edit), what other documents exist, and what it has ALREADY
 * PROPOSED (pending) — so it can't re-propose blindly. Read-only, cheap.
 */
export function describeNotesContext(library: DocumentLibraryStore, doc: DocEditorStore, proposals: ProposalStore): string {
  const { docs, activeId } = library.getState()
  const { name, text } = doc.getState()
  const trimmed = text.trim()
  const lines: string[] = []

  if (!trimmed) {
    lines.push(`Notes: active document = "${name}" (empty — use append_document to add content).`)
  } else {
    const words = trimmed.split(/\s+/).length
    lines.push(`Notes: active document = "${name}" (~${words} words).`)
  }

  const others = docs.filter((d) => d.id !== activeId).map((d) => `"${d.name}"`)
  if (others.length) {
    lines.push(`Other documents: ${others.join(', ')}. Use create_document to start a new one.`)
  }

  const pendingAppends = proposals.forModule('doc-editor-append').length
  const pendingDocs = proposals.forModule('doc-library').map((c) => `"${(c.payload as { name?: string }).name ?? 'Untitled.md'}"`)
  const pending: string[] = []
  if (pendingAppends) pending.push(`${pendingAppends} append${pendingAppends === 1 ? '' : 's'} to "${name}"`)
  if (pendingDocs.length) pending.push(`new document${pendingDocs.length === 1 ? '' : 's'} ${pendingDocs.join(', ')}`)
  if (pending.length) {
    lines.push(`Already PROPOSED (awaiting the user's approval — do NOT propose these again): ${pending.join('; ')}.`)
  }
  return lines.join('\n')
}
