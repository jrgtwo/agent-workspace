import type { DocEditorStore } from './docEditorStore'
import type { DocumentLibraryStore } from './documentLibraryStore'

/**
 * A one-shot, plain-text snapshot of the notes workspace the agent is working in, injected into
 * the system prompt each run: which document is active, whether it's empty (so the model reaches
 * for append_document instead of propose_edit), and what other documents exist. Read-only, cheap.
 */
export function describeNotesContext(library: DocumentLibraryStore, doc: DocEditorStore): string {
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
  return lines.join('\n')
}
