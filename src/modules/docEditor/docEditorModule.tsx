import { useStore } from '../../core/emitter'
import type { ToolDef, WorkspaceModule } from '../../core/types'
import type { DocEditorStore } from './docEditorStore'
import type { ProposalStore } from '../../core/proposalStore'
import type { DocumentLibraryStore } from './documentLibraryStore'
import { ReviewPanel } from './docEditorReview'
import type { DocEditPayload, DocAppendPayload } from './diff/types'
import { countOccurrences } from './diff/blocks'
import { MilkdownEditor } from './milkdownEditor'
import { PendingReview } from '../proposals/PendingReview'
import type { ProposalApplier } from '../../core/proposalApplier'

export function DocEditorPanel({ store, proposals, applier, saveImage }: { store: DocEditorStore; proposals: ProposalStore; applier: ProposalApplier; saveImage?: (file: File) => Promise<string> }) {
  const { text } = useStore(store)
  const { pending } = useStore(proposals)
  const mine = pending.filter((c) => c.moduleId === 'doc-editor')

  if (mine.length === 0) {
    return (
      <>
        <PendingReview proposals={proposals} applier={applier} moduleId="doc-editor-append" />
        <MilkdownEditor store={store} saveImage={saveImage} />
      </>
    )
  }

  return (
    <ReviewPanel
      text={text}
      changes={mine}
      onAccept={(c) => applier.accept(c)}
      onReject={(c) => applier.reject(c)}
      onAcceptAll={() => { for (const c of [...mine]) applier.accept(c) }}
      onRejectAll={() => { for (const c of [...mine]) applier.reject(c) }}
    />
  )
}

export function createDocEditorModule(
  store: DocEditorStore,
  proposals: ProposalStore,
  deps: { applier: ProposalApplier; saveImage?: (file: File) => Promise<string>; library?: DocumentLibraryStore },
): WorkspaceModule {
  const saveImage = deps.saveImage
  const library = deps.library
  const applier = deps.applier
  const resource = `document:${store.getState().name}`

  const tools: ToolDef[] = [
    {
      name: 'read_document',
      description: 'Read the full text of the current document.',
      parameters: { type: 'object', properties: {} },
      permission: { kind: 'read', resource, locality: 'LOCAL', describe: () => `Read ${store.getState().name}?` },
      handler: () => store.getState().text,
    },
    {
      name: 'propose_edit',
      description:
        'Propose replacing the first occurrence of `find` with `replace`. Make ONE small, single-purpose edit per call — keep `find` to the smallest span that captures the change (a phrase, sentence, or single paragraph), and do NOT bundle unrelated edits into one call. When rewording, INCLUDE the words being replaced in `find` (e.g. to change "dreaming" to "and dreamed", use find "dreaming", not an insertion next to it) so the diff shows the removal. To make several changes, call propose_edit multiple times so the user can accept or reject each independently. ALWAYS include `reason`: one short sentence explaining why this edit improves the document. The change is shown to the user as a diff to accept or reject; it is NOT applied until they accept.',
      parameters: {
        type: 'object',
        properties: {
          find: { type: 'string' },
          replace: { type: 'string' },
          reason: { type: 'string', description: 'One short sentence: why this edit is proposed.' },
        },
        required: ['find', 'replace', 'reason'],
      },
      handler: (a: { find: string; replace: string; reason: string }) => {
        // `find` must match exactly one place, or we can't know which occurrence the agent meant.
        const matches = countOccurrences(store.getState().text, a.find)
        if (!a.find) return { proposed: false, error: '`find` must not be empty.' }
        if (matches === 0) return { proposed: false, error: 'No match: that `find` text is not in the document. Copy the exact current text.' }
        if (matches > 1) return { proposed: false, error: `Ambiguous: \`find\` appears ${matches} times. Include surrounding text so it matches exactly one place.` }
        proposals.propose({
          moduleId: 'doc-editor',
          summary: `Replace "${a.find}" with "${a.replace}"`,
          payload: { find: a.find, replace: a.replace, reason: a.reason } satisfies DocEditPayload,
        })
        return { proposed: true, message: 'Proposed edit; awaiting your review.' }
      },
    },
    {
      name: 'append_document',
      description:
        'Propose appending a block of markdown to the END of the current document. Use this to ADD new ' +
        'content — including writing the first content into an empty document (propose_edit cannot, since ' +
        'it needs existing text to match). For changing EXISTING text, use propose_edit instead. The ' +
        'append is shown to the user as a pending change to accept or reject; it is NOT applied until they accept.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Markdown to append.' },
          reason: { type: 'string', description: 'One short sentence: why this content is added.' },
        },
        required: ['text'],
      },
      handler: (a: { text: string; reason?: string }) => {
        if (!a.text?.trim()) return { proposed: false, error: '`text` must not be empty.' }
        // Loop guard: don't re-propose an identical append that's already pending (the agent can't see its
        // own pending proposals in the notes snapshot). Distinct appends are fine.
        const alreadyPending = proposals.forModule('doc-editor-append').some((c) => (c.payload as DocAppendPayload).text.trim() === a.text.trim())
        if (alreadyPending) {
          return { ok: true, alreadyPending: true, message: 'That append is already pending your review — not duplicating it.' }
        }
        const preview = a.text.length > 60 ? a.text.slice(0, 60) + '…' : a.text
        proposals.propose({
          moduleId: 'doc-editor-append',
          summary: `Append to ${store.getState().name}: "${preview}"`,
          payload: { text: a.text, reason: a.reason ?? 'Add new content.' } satisfies DocAppendPayload,
        })
        return { proposed: true, message: 'Proposed append; awaiting your review.' }
      },
    },
  ]

  if (library) {
    tools.push({
      name: 'create_document',
      description:
        'Propose creating a new, empty document. Optionally provide a file name (e.g. "Plan.md"); ' +
        'defaults to Untitled.md. Shown to the user as a pending change; the document is not created ' +
        'until they accept.',
      parameters: { type: 'object', properties: { name: { type: 'string' } } },
      handler: (a: { name?: string }) => {
        const name = a?.name ?? 'Untitled.md'
        // Loop guard: don't re-propose a new document with a name already pending.
        const alreadyPending = proposals.forModule('doc-library').some((c) => ((c.payload as { name?: string }).name ?? 'Untitled.md') === name)
        if (alreadyPending) {
          return { ok: true, alreadyPending: true, message: `A new document "${name}" is already pending — not duplicating it.` }
        }
        proposals.propose({
          moduleId: 'doc-library',
          summary: `Create document "${name}"`,
          payload: { name: a?.name },
        })
        return { proposed: true, message: `Proposed new document "${name}"; awaiting your review.` }
      },
    })
  }

  return {
    id: 'doc-editor',
    title: `Document — ${store.getState().name}`,
    locality: 'LOCAL',
    layoutHints: { defaultSize: 60, collapsible: false, minSize: 30 },
    render: () => <DocEditorPanel store={store} proposals={proposals} applier={applier} saveImage={saveImage} />,
    tools,
  }
}
