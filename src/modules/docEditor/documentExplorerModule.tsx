import { useState } from 'react'
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { DocumentLibraryStore } from './documentLibraryStore'
import './documentExplorer.css'

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
    <div className="explorer">
      <div className="explorer__head">
        <span className="explorer__title">DOCUMENTS</span>
        <button aria-label="new document" onClick={() => void library.create()} className="btn btn--icon" style={{ marginLeft: 'auto' }}>+ New</button>
      </div>
      <div className="explorer__list">
        {docs.map((d) => (
          <div key={d.id} className="explorer__row">
            {renamingId === d.id ? (
              <input
                autoFocus
                aria-label="rename document"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => { if (e.key === 'Enter') commitRename() }}
                className="explorer__rename"
              />
            ) : (
              <button
                onClick={() => void library.setActive(d.id)}
                onDoubleClick={() => startRename(d.id, d.name)}
                className={`explorer__item${d.id === activeId ? ' explorer__item--active' : ''}`}
              >
                {d.name}
              </button>
            )}
            <button
              aria-label={`delete ${d.name}`}
              onClick={() => { if (confirm(`Delete ${d.name}?`)) void library.delete(d.id) }}
              className="btn btn--icon btn--danger"
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
