import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { MemoryStore } from '../../core/memoryStore'

function MemoryPanel({ store }: { store: MemoryStore }) {
  const { entries } = useStore(store)
  return (
    <div style={{ padding: 10, overflowY: 'auto', height: '100%' }}>
      {entries.length === 0 && <p style={{ color: '#888', fontSize: 12 }}>Nothing learned yet.</p>}
      {entries.map((e) => (
        <div key={e.id} style={{ display: 'flex', gap: 8, alignItems: 'start', marginBottom: 6, fontSize: 12 }}>
          <span style={{ flex: 1 }}>{e.text}</span>
          <button aria-label={`forget ${e.id}`} onClick={() => store.remove(e.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}

export function createMemoryViewerModule(store: MemoryStore): WorkspaceModule {
  return {
    id: 'memory-viewer',
    title: 'Memory',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 30, collapsible: true, minSize: 15 },
    render: () => <MemoryPanel store={store} />,
    tools: [
      {
        name: 'remember',
        description: 'Save a concise, durable fact about the user that will help future collaboration.',
        parameters: {
          type: 'object',
          properties: { fact: { type: 'string' } },
          required: ['fact'],
        },
        // LOCAL, auto-saved (no network); always user-inspectable and deletable in this panel.
        handler: (a: { fact: string }) => { store.add(a.fact); return { saved: true } },
      },
    ],
  }
}
