import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { DocEditorStore } from './docEditorStore'
import type { ProposalStore } from '../../core/proposalStore'
import { ReviewPanel } from './docEditorReview'
import type { DocEditPayload } from './diff/types'
import { countOccurrences } from './diff/blocks'
import { MilkdownEditor } from './milkdownEditor'

function DocEditorPanel({ store, proposals, saveImage }: { store: DocEditorStore; proposals: ProposalStore; saveImage?: (file: File) => Promise<string> }) {
  const { text } = useStore(store)
  const { pending } = useStore(proposals)
  const mine = pending.filter((c) => c.moduleId === 'doc-editor')

  if (mine.length === 0) {
    return <MilkdownEditor store={store} saveImage={saveImage} />
  }

  return (
    <ReviewPanel
      text={text}
      changes={mine}
      onAccept={(c) => { if (store.applyChange(c.payload as DocEditPayload)) proposals.remove(c.id) }}
      onReject={(c) => proposals.remove(c.id)}
      onAcceptAll={() => { for (const c of [...mine]) { if (store.applyChange(c.payload as DocEditPayload)) proposals.remove(c.id) } }}
      onRejectAll={() => { for (const c of [...mine]) proposals.remove(c.id) }}
    />
  )
}

export function createDocEditorModule(store: DocEditorStore, proposals: ProposalStore, saveImage?: (file: File) => Promise<string>): WorkspaceModule {
  const resource = `document:${store.getState().name}`
  return {
    id: 'doc-editor',
    title: `Document — ${store.getState().name}`,
    locality: 'LOCAL',
    layoutHints: { defaultSize: 60, collapsible: false, minSize: 30 },
    render: () => <DocEditorPanel store={store} proposals={proposals} saveImage={saveImage} />,
    tools: [
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
    ],
  }
}
