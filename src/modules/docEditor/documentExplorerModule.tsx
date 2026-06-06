import { useState } from 'react'
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { DocumentLibraryStore } from './documentLibraryStore'

function ExplorerPanel({ library }: { library: DocumentLibraryStore }) {
  const { docs, activeId } = useStore(library)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const startRename = (id: string, name: string) => { setRenamingId(id); setDraft(name) }
  const commitRename = () => {
    const id = renamingId
    if (id && draft.trim()) void library.rename(id, draft.trim())
    setRenamingId(null)
  }

  return (
    <div style={{ padding: 8, height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.05em', color: '#667' }}>DOCUMENTS</span>
        <button aria-label="new document" onClick={() => void library.create()} style={{ marginLeft: 'auto', fontSize: 11 }}>+ New</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {docs.map((d) => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {renamingId === d.id ? (
              <input
                autoFocus
                aria-label="rename document"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => { if (e.key === 'Enter') commitRename() }}
                style={{ flex: 1, fontSize: 11 }}
              />
            ) : (
              <button
                onClick={() => void library.setActive(d.id)}
                onDoubleClick={() => startRename(d.id, d.name)}
                style={{ flex: 1, textAlign: 'left', fontSize: 11, padding: '4px 6px', borderRadius: 4, border: '1px solid #ececf3', cursor: 'pointer', background: d.id === activeId ? '#5b6cff' : '#fff', color: d.id === activeId ? '#fff' : '#445' }}
              >
                {d.name}
              </button>
            )}
            <button
              aria-label={`delete ${d.name}`}
              onClick={() => { if (confirm(`Delete ${d.name}?`)) void library.delete(d.id) }}
              style={{ fontSize: 10, color: '#a55', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function createDocumentExplorerModule(library: DocumentLibraryStore): WorkspaceModule {
  return {
    id: 'document-explorer',
    title: 'Documents',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 16, collapsible: true, minSize: 10 },
    render: () => <ExplorerPanel library={library} />,
    tools: [],
  }
}
