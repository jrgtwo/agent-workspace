import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { DocEditorStore } from './docEditorStore'

function DocEditorPanel({ store }: { store: DocEditorStore }) {
  const { text } = useStore(store)
  return (
    <textarea
      aria-label="document"
      style={{ width: '100%', height: '100%', border: 'none', resize: 'none', padding: 12, font: 'inherit' }}
      value={text}
      onChange={(e) => store.setText(e.target.value)}
    />
  )
}

export function createDocEditorModule(store: DocEditorStore): WorkspaceModule {
  const resource = `document:${store.getState().name}`
  return {
    id: 'doc-editor',
    title: `Document — ${store.getState().name}`,
    locality: 'LOCAL',
    layoutHints: { defaultSize: 60, collapsible: false, minSize: 30 },
    render: () => <DocEditorPanel store={store} />,
    tools: [
      {
        name: 'read_document',
        description: 'Read the full text of the current document.',
        parameters: { type: 'object', properties: {} },
        permission: { kind: 'read', resource, locality: 'LOCAL', describe: () => `Read ${store.getState().name}?` },
        handler: () => store.getState().text,
      },
      {
        name: 'apply_edit',
        description: 'Replace the first occurrence of `find` with `replace` in the document.',
        parameters: {
          type: 'object',
          properties: { find: { type: 'string' }, replace: { type: 'string' } },
          required: ['find', 'replace'],
        },
        permission: { kind: 'write', resource, locality: 'LOCAL', describe: (a: any) => `Edit ${store.getState().name} (replace "${a?.find ?? ''}")?` },
        handler: (a: { find: string; replace: string }) => ({ applied: store.applyEdit(a.find, a.replace) }),
      },
    ],
  }
}
