import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { DocEditorStore } from './docEditorStore'
import type { ProposalStore } from '../../core/proposalStore'
import { ReviewPanel, type DocEditPayload } from './docEditorReview'
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
      onAccept={(c) => { store.applyChange(c.payload as DocEditPayload); proposals.remove(c.id) }}
      onReject={(c) => proposals.remove(c.id)}
      onAcceptAll={() => { for (const c of [...mine]) { store.applyChange(c.payload as DocEditPayload); proposals.remove(c.id) } }}
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
          'Propose replacing the first occurrence of `find` with `replace`. The change is shown to the user as a diff to accept or reject; it is NOT applied until they accept.',
        parameters: {
          type: 'object',
          properties: { find: { type: 'string' }, replace: { type: 'string' } },
          required: ['find', 'replace'],
        },
        handler: (a: { find: string; replace: string }) => {
          proposals.propose({
            moduleId: 'doc-editor',
            summary: `Replace "${a.find}" with "${a.replace}"`,
            payload: { find: a.find, replace: a.replace },
          })
          return { proposed: true, message: 'Proposed edit; awaiting your review.' }
        },
      },
    ],
  }
}
