import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { MemoryStore } from '../../core/memoryStore'
import './memoryViewer.css'

function MemoryPanel({ store }: { store: MemoryStore }) {
  const { entries } = useStore(store)
  return (
    <div className="memory">
      {entries.length === 0 && <p className="memory__empty">Nothing learned yet.</p>}
      {entries.map((e) => (
        <div key={e.id} className="memory__row">
          <span className="memory__text">{e.text}</span>
          <button className="btn btn--icon" aria-label={`forget ${e.id}`} onClick={() => store.remove(e.id)}>✕</button>
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
